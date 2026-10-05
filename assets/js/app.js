function getLocalArtworks(){ return window.ARTWORKS || []; }
function publicConfigured(){ return !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey); }
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]; }); }
async function getSupabase(){
  if(!publicConfigured()) return null;
  if(!window.__supabaseClient){
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    window.__supabaseClient = mod.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  }
  return window.__supabaseClient;
}
async function loadArtworks(){
  const local = getLocalArtworks();
  try{
    const sb = await getSupabase();
    if(!sb) return local;
    const result = await sb.from("artworks").select("*").order("featured",{ascending:false}).order("year",{ascending:false}).order("created_at",{ascending:false});
    if(result.error || !Array.isArray(result.data)) return local;
    return result.data.length ? result.data : local;
  }catch(e){ return local; }
}
function card(a){
  return '<a class="card" href="artwork/?id='+encodeURIComponent(a.id)+'">'+
    '<div class="thumb"><img src="'+esc(a.image_url || a.image || '')+'" alt="'+esc(a.title)+'" loading="lazy"></div>'+
    '<div class="body"><div class="title">'+esc(a.title)+'</div><div class="meta">'+esc(a.year)+' · '+esc(a.medium)+'</div></div></a>';
}
async function renderHome(){
  const root=document.querySelector("#gallery");
  try{
    const data=await loadArtworks();
    root.innerHTML=data.length ? data.map(card).join("") : '<div class="status">No artworks published yet.</div>';
  }catch(e){ root.innerHTML='<div class="status">Gallery could not be loaded.</div>'; }
}
async function renderArtwork(){
  const id=new URLSearchParams(location.search).get("id");
  const root=document.querySelector("#artwork");
  try{
    const data=await loadArtworks();
    const a=data.find(function(x){ return x.id===id; });
    if(!a){ root.innerHTML='<div class="status">Artwork not found. <a href="../">Return to gallery.</a></div>'; return; }
    const image= a.image_url || a.image || "";
    const audio= a.audio_url || "";
    document.title = a.title + " · Vikalpa Chitra";
    let voice = "";
    if(audio){
      voice = '<section class="voice"><h3>Listen to the artist</h3><p>Hear the artist\'s own voice behind the work.</p><audio controls preload="none" src="'+esc(audio)+'"></audio></section>';
    }
    root.innerHTML =
      '<a class="back" href="../">← All artworks</a>'+
      '<div class="layout"><div class="image"><img src="'+esc(image)+'" alt="'+esc(a.title)+'"></div>'+
      '<div class="copy"><div class="eyebrow">'+esc(a.id)+'</div><h1>'+esc(a.title)+'</h1><div class="sub">A work by Vikalpa Chitra</div>'+
      '<div class="facts"><div class="fact"><b>Year</b>'+esc(a.year)+'</div><div class="fact"><b>Medium</b>'+esc(a.medium)+'</div>'+
      '<div class="fact"><b>Dimensions</b>'+esc(a.dimensions)+'</div><div class="fact"><b>Location</b>'+esc(a.location)+'</div></div>'+
      '<p class="story">'+esc(a.story || '')+'</p>'+voice+
      '<section class="qr"><div class="eyebrow">Artwork ID</div><p>This artwork has a permanent ID: <strong>'+esc(a.id)+'</strong>.</p><div class="qr-code">QR<br>READY</div><p>Generate the printable QR from this page URL after the custom domain is connected.</p></section>'+
      '<section class="artist"><div class="eyebrow">About the artist</div><p>Vikalpa Chitra is the artist identity of Paila Vamsi Kiran, working across watercolour, graphite, charcoal, acrylic and texture-based art.</p></section>'+
      '</div></div>';
  }catch(e){ root.innerHTML='<div class="status">Artwork could not be loaded.</div>'; }
}