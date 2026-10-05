import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.SUPABASE_CONFIG || {};
const loginPanel = document.querySelector("#loginPanel");
const manager = document.querySelector("#manager");
const loginForm = document.querySelector("#loginForm");
const loginNotice = document.querySelector("#loginNotice");
const notice = document.querySelector("#managerNotice");
const logoutBtn = document.querySelector("#logoutBtn");
const artForm = document.querySelector("#artForm");
const formHeading = document.querySelector("#formHeading");
const artList = document.querySelector("#artList");
const saveBtn = document.querySelector("#saveBtn");
const newBtn = document.querySelector("#newBtn");
const cancelBtn = document.querySelector("#cancelBtn");
const recordBtn = document.querySelector("#recordBtn");
const stopBtn = document.querySelector("#stopBtn");
const recordStatus = document.querySelector("#recordStatus");
const imageFile = document.querySelector("#imageFile");
const audioFile = document.querySelector("#audioFile");
const currentImage = document.querySelector("#currentImage");
const currentAudio = document.querySelector("#currentAudio");

let sb = null;
let editing = null;
let recording = null;
let recordedBlob = null;
let artworks = [];

function show(box, message, kind=""){
  box.textContent = message;
  box.className = "notice " + (kind || "");
  box.classList.remove("hidden");
}
function hide(box){ box.classList.add("hidden"); }

function requireConfig(){
  if(!cfg.url || !cfg.anonKey){
    show(loginNotice, "Connect Supabase first: create a project, run supabase-setup.sql, then put the Project URL and anon/publishable key in assets/js/config.js. Never put the service_role key in this file.", "error");
    loginForm.classList.add("hidden");
    return false;
  }
  sb = createClient(cfg.url, cfg.anonKey);
  return true;
}

async function sessionCheck(){
  if(!requireConfig()) return;
  const {data} = await sb.auth.getSession();
  if(data.session) openManager();
}

async function login(e){
  e.preventDefault();
  hide(loginNotice);
  const email=document.querySelector("#email").value.trim();
  const password=document.querySelector("#password").value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error){ show(loginNotice,error.message,"error"); return; }
  openManager();
}

async function openManager(){
  loginPanel.classList.add("hidden");
  manager.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  resetForm();
  await loadList();
}

async function logout(){
  await sb.auth.signOut();
  manager.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  loginPanel.classList.remove("hidden");
}

function resetForm(){
  editing=null;
  recordedBlob=null;
  artForm.reset();
  document.querySelector("#published").checked=true;
  formHeading.textContent="Add artwork";
  saveBtn.textContent="Save artwork";
  currentImage.textContent="";
  currentAudio.textContent="";
  recordStatus.textContent="";
  imageFile.value="";
  audioFile.value="";
  stopRecordingUI();
}

function fillForm(a){
  editing=a;
  document.querySelector("#artId").value=a.id||"";
  document.querySelector("#title").value=a.title||"";
  document.querySelector("#year").value=a.year||"";
  document.querySelector("#medium").value=a.medium||"";
  document.querySelector("#dimensions").value=a.dimensions||"";
  document.querySelector("#location").value=a.location||"";
  document.querySelector("#story").value=a.story||"";
  document.querySelector("#published").checked=!!a.published;
  document.querySelector("#featured").checked=!!a.featured;
  currentImage.textContent=a.image_url ? "Current image is already saved." : "";
  currentAudio.textContent=a.audio_url ? "Current voice note is already saved." : "";
  formHeading.textContent="Edit " + a.id;
  saveBtn.textContent="Update artwork";
  window.scrollTo({top:0,behavior:"smooth"});
}

async function loadList(){
  const {data,error}=await sb.from("artworks").select("*").order("created_at",{ascending:false});
  if(error){ show(notice,error.message,"error"); return; }
  artworks=data||[];
  renderList();
}
function renderList(){
  if(!artworks.length){ artList.innerHTML='<div class="status">No artworks yet. Add your first artwork above.</div>'; return; }
  artList.innerHTML=artworks.map(a=>{
    const img=a.image_url || "../assets/images/VC-001.svg";
    return '<div class="admin-item">'+
      '<img src="'+esc(img)+'" alt="">'+
      '<div><h3>'+esc(a.id)+' · '+esc(a.title)+'</h3><p>'+esc(a.year||"")+' · '+esc(a.medium||"")+' · '+(a.published?"Published":"Draft")+'</p></div>'+
      '<div class="actions item-actions"><button class="btn secondary" data-edit="'+esc(a.id)+'">Edit</button><button class="btn danger" data-delete="'+esc(a.id)+'">Delete</button></div>'+
      '</div>';
  }).join("");
  artList.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>fillForm(artworks.find(a=>a.id===btn.dataset.edit))));
  artList.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>removeArtwork(btn.dataset.delete)));
}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}

async function nextId(){
  let max=0;
  artworks.forEach(a=>{const m=String(a.id||"").match(/^VC-(\d+)$/);if(m)max=Math.max(max,Number(m[1]));});
  document.querySelector("#artId").value="VC-"+String(max+1).padStart(3,"0");
}
async function uploadFile(bucket,file,id){
  const ext=(file.name.split(".").pop()||"bin").toLowerCase();
  const path=id+"/"+crypto.randomUUID()+"."+ext;
  const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(error) throw error;
  const pub=sb.storage.from(bucket).getPublicUrl(path);
  return {path,url:pub.data.publicUrl};
}

async function saveArtwork(e){
  e.preventDefault();
  hide(notice);
  saveBtn.disabled=true;
  saveBtn.textContent="Saving…";
  try{
    const id=document.querySelector("#artId").value.trim().toUpperCase();
    const title=document.querySelector("#title").value.trim();
    if(!/^VC-\d{3,}$/.test(id)) throw new Error("Artwork ID must look like VC-001.");
    if(!title) throw new Error("Title is required.");
    if(!editing && artworks.some(a=>a.id===id)) throw new Error("That artwork ID already exists.");

    let image_url=editing?.image_url||null, image_path=editing?.image_path||null;
    let audio_url=editing?.audio_url||null, audio_path=editing?.audio_path||null;
    const newImage=imageFile.files[0];
    const newAudio=audioFile.files[0] || recordedBlob;

    if(newImage){
      const up=await uploadFile("artworks",newImage,id);
      if(image_path) await sb.storage.from("artworks").remove([image_path]);
      image_url=up.url; image_path=up.path;
    } else if(!editing?.image_url) {
      throw new Error("Please select an artwork image.");
    }

    if(newAudio){
      const audioFileForUpload = newAudio instanceof File ? newAudio : new File([newAudio],"voice.webm",{type:newAudio.type||"audio/webm"});
      const up=await uploadFile("audio",audioFileForUpload,id);
      if(audio_path) await sb.storage.from("audio").remove([audio_path]);
      audio_url=up.url; audio_path=up.path;
    }

    const record={
      id,title,
      year:document.querySelector("#year").value?Number(document.querySelector("#year").value):null,
      medium:document.querySelector("#medium").value.trim(),
      dimensions:document.querySelector("#dimensions").value.trim(),
      location:document.querySelector("#location").value.trim(),
      story:document.querySelector("#story").value.trim(),
      image_url,image_path,audio_url,audio_path,
      featured:document.querySelector("#featured").checked,
      published:document.querySelector("#published").checked,
      updated_at:new Date().toISOString()
    };
    const {error}=await sb.from("artworks").upsert(record,{onConflict:"id"});
    if(error) throw error;
    show(notice, id+" saved successfully.","success");
    resetForm();
    await loadList();
  }catch(err){
    show(notice,err.message||"Could not save artwork.","error");
  }finally{
    saveBtn.disabled=false;
    saveBtn.textContent=editing?"Update artwork":"Save artwork";
  }
}

async function removeArtwork(id){
  const a=artworks.find(x=>x.id===id);
  if(!a || !confirm("Delete "+id+" permanently?")) return;
  try{
    const {error}=await sb.from("artworks").delete().eq("id",id);
    if(error) throw error;
    const paths=[];
    if(a.image_path) await sb.storage.from("artworks").remove([a.image_path]);
    if(a.audio_path) await sb.storage.from("audio").remove([a.audio_path]);
    show(notice,id+" deleted.","success");
    if(editing?.id===id) resetForm();
    await loadList();
  }catch(err){ show(notice,err.message||"Could not delete artwork.","error"); }
}

async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia){ show(notice,"This browser does not support voice recording. Upload an MP3 instead.","error"); return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
    const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||"";
    recording={stream,chunks:[],recorder:new MediaRecorder(stream,mime?{mimeType:mime}:undefined)};
    recording.recorder.ondataavailable=e=>{if(e.data.size)recording.chunks.push(e.data);};
    recording.recorder.onstop=()=>{
      recordedBlob=new Blob(recording.chunks,{type:recording.recorder.mimeType||"audio/webm"});
      stream.getTracks().forEach(t=>t.stop());
      recordStatus.textContent="New voice recording ready. Save the artwork to upload it.";
      stopRecordingUI();
    };
    recording.recorder.start();
    recordBtn.classList.add("hidden"); stopBtn.classList.remove("hidden");
    recordStatus.textContent="Recording…";
  }catch(err){ show(notice,"Microphone access was denied or unavailable.","error"); }
}
function stopRecordingUI(){recordBtn.classList.remove("hidden");stopBtn.classList.add("hidden");}
function stopRecording(){if(recording?.recorder?.state==="recording") recording.recorder.stop(); recording=null;}

loginForm.addEventListener("submit",login);
logoutBtn.addEventListener("click",logout);
artForm.addEventListener("submit",saveArtwork);
newBtn.addEventListener("click",resetForm);
cancelBtn.addEventListener("click",resetForm);
recordBtn.addEventListener("click",startRecording);
stopBtn.addEventListener("click",stopRecording);
document.querySelector("#artId").addEventListener("dblclick",nextId);

sessionCheck();
