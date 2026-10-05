const cfg = window.SUPABASE_CONFIG || {};
const loginPanel = document.querySelector("#loginPanel");
const manager = document.querySelector("#manager");
const otpForm = document.querySelector("#otpForm");
const loginNotice = document.querySelector("#loginNotice");
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
const phoneStep = document.querySelector("#phoneStep");
const otpStep = document.querySelector("#otpStep");
const phoneInput = document.querySelector("#phone");
const otpInput = document.querySelector("#otp");
const sendOtpBtn = document.querySelector("#sendOtpBtn");
const verifyOtpBtn = document.querySelector("#verifyOtpBtn");
const resendBtn = document.querySelector("#resendBtn");
const changePhoneBtn = document.querySelector("#changePhoneBtn");
const otpTimer = document.querySelector("#otpTimer");

let sb = null;
let editing = null;
let recording = null;
let recordedBlob = null;
let artworks = [];
let pendingPhone = "";
let resendAvailableAt = 0;
let timerHandle = null;

function show(box, message, kind=""){
  box.textContent = message;
  box.className = "notice " + (kind || "");
  box.classList.remove("hidden");
}
function hide(box){ box.classList.add("hidden"); }

function normalizePhone(v){
  const raw = v.trim().replace(/[\s()-]/g,"");
  if(/^\d{10}$/.test(raw)) return "+91"+raw;
  if(/^91\d{10}$/.test(raw)) return "+"+raw;
  if(/^\+91\d{10}$/.test(raw)) return raw;
  return raw;
}

function requireConfig(){
  if(!window.supabase){ show(loginNotice,"The login service could not load. Refresh once or check your internet connection.","error"); return false; }
  if(!cfg.url || !cfg.anonKey){
    show(loginNotice,"Supabase is not configured yet. Add the Project URL and publishable key in assets/js/config.js.","error");
    otpForm.classList.add("hidden");
    return false;
  }
  sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  return true;
}

async function isApprovedManager(){
  const {data,error}=await sb.from("admin_users").select("user_id").limit(1);
  return !error && Array.isArray(data) && data.length > 0;
}
async function sessionCheck(){
  if(!requireConfig()) return;
  const {data} = await sb.auth.getSession();
  if(data.session){
    if(await isApprovedManager()) openManager();
    else { await sb.auth.signOut(); show(loginNotice,"This mobile number is authenticated but is not approved as a Vikalpa Chitra manager.","error"); }
  }
}

async function sendOtp(e){
  e?.preventDefault();
  hide(loginNotice);
  const phone = normalizePhone(phoneInput.value);
  if(!/^\+91\d{10}$/.test(phone)){
    show(loginNotice,"Enter a valid Indian mobile number, for example +91 9876543210.","error");
    return;
  }
  sendOtpBtn.disabled=true;
  sendOtpBtn.textContent="Sending…";
  const {error}=await sb.auth.signInWithOtp({
    phone,
    options:{shouldCreateUser:false}
  });
  if(error){
    show(loginNotice,error.message,"error");
    sendOtpBtn.disabled=false;
    sendOtpBtn.textContent="Send OTP";
    return;
  }
  pendingPhone=phone;
  phoneStep.classList.add("hidden");
  otpStep.classList.remove("hidden");
  otpInput.value="";
  otpInput.focus();
  startResendTimer(60);
  show(loginNotice,"OTP sent to your mobile.","success");
  sendOtpBtn.disabled=false;
  sendOtpBtn.textContent="Send OTP";
}

async function verifyOtp(){
  hide(loginNotice);
  const token=otpInput.value.trim();
  if(!/^\d{6}$/.test(token)){
    show(loginNotice,"Enter the 6-digit OTP.","error");
    return;
  }
  verifyOtpBtn.disabled=true;
  verifyOtpBtn.textContent="Verifying…";
  const {data,error}=await sb.auth.verifyOtp({
    phone:pendingPhone,
    token,
    type:"sms"
  });
  if(error){
    show(loginNotice,error.message,"error");
    verifyOtpBtn.disabled=false;
    verifyOtpBtn.textContent="Verify & sign in";
    return;
  }
  if(!data?.session){
    show(loginNotice,"OTP verified, but a session was not created.","error");
    verifyOtpBtn.disabled=false;
    verifyOtpBtn.textContent="Verify & sign in";
    return;
  }
  if(!(await isApprovedManager())){
    await sb.auth.signOut();
    show(loginNotice,"OTP verified, but this mobile number is not approved as a Vikalpa Chitra manager.","error");
    verifyOtpBtn.disabled=false;
    verifyOtpBtn.textContent="Verify & sign in";
    return;
  }
  verifyOtpBtn.disabled=false;
  verifyOtpBtn.textContent="Verify & sign in";
  clearResendTimer();
  openManager();
}

function startResendTimer(seconds){
  clearResendTimer();
  resendAvailableAt=Date.now()+seconds*1000;
  resendBtn.disabled=true;
  const tick=()=>{
    const left=Math.max(0,Math.ceil((resendAvailableAt-Date.now())/1000));
    if(left<=0){
      resendBtn.disabled=false;
      otpTimer.textContent="You can request another OTP.";
      clearInterval(timerHandle);
      return;
    }
    otpTimer.textContent="You can request another OTP in "+left+"s.";
  };
  tick();
  timerHandle=setInterval(tick,500);
}
function clearResendTimer(){
  if(timerHandle) clearInterval(timerHandle);
  timerHandle=null;
  resendAvailableAt=0;
}
async function resendOtp(){
  if(Date.now()<resendAvailableAt || !pendingPhone) return;
  resendBtn.disabled=true;
  const {error}=await sb.auth.signInWithOtp({phone:pendingPhone,options:{shouldCreateUser:false}});
  if(error){
    show(loginNotice,error.message,"error");
    resendBtn.disabled=false;
    return;
  }
  show(loginNotice,"A new OTP was sent.","success");
  startResendTimer(60);
}
function changePhone(){
  pendingPhone="";
  otpInput.value="";
  clearResendTimer();
  otpStep.classList.add("hidden");
  phoneStep.classList.remove("hidden");
  otpTimer.textContent="";
  phoneInput.focus();
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
  otpStep.classList.add("hidden");
  phoneStep.classList.remove("hidden");
  phoneInput.value="";
  otpInput.value="";
  pendingPhone="";
  clearResendTimer();
}

function resetForm(){
  editing=null; recordedBlob=null; artForm.reset();
  document.querySelector("#published").checked=true;
  formHeading.textContent="Add artwork"; saveBtn.textContent="Save artwork";
  currentImage.textContent=""; currentAudio.textContent=""; recordStatus.textContent="";
  imageFile.value=""; audioFile.value=""; stopRecordingUI();
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
  formHeading.textContent="Edit "+a.id; saveBtn.textContent="Update artwork";
  window.scrollTo({top:0,behavior:"smooth"});
}
async function loadList(){
  const {data,error}=await sb.from("artworks").select("*").order("created_at",{ascending:false});
  if(error){show(document.querySelector("#managerNotice"),error.message,"error");return;}
  artworks=data||[]; renderList();
  const totalEl=document.querySelector("#countTotal"), pubEl=document.querySelector("#countPublished"), featEl=document.querySelector("#countFeatured");
  if(totalEl) totalEl.textContent=artworks.length;
  if(pubEl) pubEl.textContent=artworks.filter(a=>a.published).length;
  if(featEl) featEl.textContent=artworks.filter(a=>a.featured).length;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function renderList(){
  if(!artworks.length){artList.innerHTML='<div class="status">No artworks yet. Add your first artwork above.</div>';return;}
  artList.innerHTML=artworks.map(a=>{
    const img=a.image_url||"../assets/images/VC-001.svg";
    return '<div class="admin-item"><img src="'+esc(img)+'" alt=""><div><h3>'+esc(a.id)+' · '+esc(a.title)+'</h3><p>'+esc(a.year||"")+' · '+esc(a.medium||"")+' · '+(a.published?"Published":"Draft")+'</p></div><div class="actions item-actions"><button class="btn secondary" data-edit="'+esc(a.id)+'">Edit</button><button class="btn danger" data-delete="'+esc(a.id)+'">Delete</button></div></div>';
  }).join("");
  artList.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>fillForm(artworks.find(a=>a.id===btn.dataset.edit))));
  artList.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>removeArtwork(btn.dataset.delete)));
}
async function nextId(){
  let max=0; artworks.forEach(a=>{const m=String(a.id||"").match(/^VC-(\d+)$/);if(m)max=Math.max(max,Number(m[1]));});
  document.querySelector("#artId").value="VC-"+String(max+1).padStart(3,"0");
}
async function uploadFile(bucket,file,id){
  const ext=(file.name.split(".").pop()||"bin").toLowerCase();
  const path=id+"/"+crypto.randomUUID()+"."+ext;
  const {error}=await sb.storage.from(bucket).upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(error)throw error;
  return {path,url:sb.storage.from(bucket).getPublicUrl(path).data.publicUrl};
}
async function saveArtwork(e){
  e.preventDefault();
  const managerNotice=document.querySelector("#managerNotice"); hide(managerNotice);
  saveBtn.disabled=true; saveBtn.textContent="Saving…";
  try{
    const id=document.querySelector("#artId").value.trim().toUpperCase();
    const title=document.querySelector("#title").value.trim();
    if(!/^VC-\d{3,}$/.test(id))throw new Error("Artwork ID must look like VC-001.");
    if(!title)throw new Error("Title is required.");
    if(!editing&&artworks.some(a=>a.id===id))throw new Error("That artwork ID already exists.");
    let image_url=editing?.image_url||null,image_path=editing?.image_path||null,audio_url=editing?.audio_url||null,audio_path=editing?.audio_path||null;
    const newImage=imageFile.files[0],newAudio=audioFile.files[0]||recordedBlob;
    if(newImage){const up=await uploadFile("artworks",newImage,id);if(image_path)await sb.storage.from("artworks").remove([image_path]);image_url=up.url;image_path=up.path;}
    else if(!editing?.image_url)throw new Error("Please select an artwork image.");
    if(newAudio){const af=newAudio instanceof File?newAudio:new File([newAudio],"voice.webm",{type:newAudio.type||"audio/webm"});const up=await uploadFile("audio",af,id);if(audio_path)await sb.storage.from("audio").remove([audio_path]);audio_url=up.url;audio_path=up.path;}
    const record={id,title,year:document.querySelector("#year").value?Number(document.querySelector("#year").value):null,medium:document.querySelector("#medium").value.trim(),dimensions:document.querySelector("#dimensions").value.trim(),location:document.querySelector("#location").value.trim(),story:document.querySelector("#story").value.trim(),image_url,image_path,audio_url,audio_path,featured:document.querySelector("#featured").checked,published:document.querySelector("#published").checked,updated_at:new Date().toISOString()};
    const {error}=await sb.from("artworks").upsert(record,{onConflict:"id"});if(error)throw error;
    show(managerNotice,id+" saved successfully.","success");resetForm();await loadList();
  }catch(err){show(managerNotice,err.message||"Could not save artwork.","error");}
  finally{saveBtn.disabled=false;saveBtn.textContent=editing?"Update artwork":"Save artwork";}
}
async function removeArtwork(id){
  const a=artworks.find(x=>x.id===id);if(!a||!confirm("Delete "+id+" permanently?"))return;
  const managerNotice=document.querySelector("#managerNotice");
  try{const {error}=await sb.from("artworks").delete().eq("id",id);if(error)throw error;if(a.image_path)await sb.storage.from("artworks").remove([a.image_path]);if(a.audio_path)await sb.storage.from("audio").remove([a.audio_path]);show(managerNotice,id+" deleted.","success");if(editing?.id===id)resetForm();await loadList();}catch(err){show(managerNotice,err.message||"Could not delete artwork.","error");}
}
async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia){show(document.querySelector("#managerNotice"),"Voice recording is not supported here. Upload an audio file instead.","error");return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const types=["audio/webm;codecs=opus","audio/webm","audio/mp4"];const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||"";
    recording={stream,chunks:[],recorder:new MediaRecorder(stream,mime?{mimeType:mime}:undefined)};
    recording.recorder.ondataavailable=e=>{if(e.data.size)recording.chunks.push(e.data);};
    recording.recorder.onstop=()=>{recordedBlob=new Blob(recording.chunks,{type:recording.recorder.mimeType||"audio/webm"});stream.getTracks().forEach(t=>t.stop());recordStatus.textContent="New voice recording ready. Save the artwork to upload it.";stopRecordingUI();};
    recording.recorder.start();recordBtn.classList.add("hidden");stopBtn.classList.remove("hidden");recordStatus.textContent="Recording…";
  }catch(err){show(document.querySelector("#managerNotice"),"Microphone access was denied or unavailable.","error");}
}
function stopRecordingUI(){recordBtn.classList.remove("hidden");stopBtn.classList.add("hidden");}
function stopRecording(){if(recording?.recorder?.state==="recording")recording.recorder.stop();recording=null;}

otpForm.addEventListener("submit",sendOtp);
verifyOtpBtn.addEventListener("click",verifyOtp);
resendBtn.addEventListener("click",resendOtp);
changePhoneBtn.addEventListener("click",changePhone);
logoutBtn.addEventListener("click",logout);
artForm.addEventListener("submit",saveArtwork);
newBtn.addEventListener("click",resetForm);
cancelBtn.addEventListener("click",resetForm);
recordBtn.addEventListener("click",startRecording);
stopBtn.addEventListener("click",stopRecording);
document.querySelector("#artId").addEventListener("dblclick",nextId);

sessionCheck();