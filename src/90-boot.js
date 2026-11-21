/* =================== BOOT =================== */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); installEvt = e; if(tab==="home") render(); });
applyTheme();
if(COACH_MODE){
  handleCoachHash();
  window.addEventListener("hashchange", ()=>{ if(/^#go-/.test(location.hash)){ handleCoachHash(); render(); } });
} else {
  const onHash = ()=>{ handleClaim(); handleRewardsLink(); handleProgressLink(); };
  window.addEventListener("hashchange", onHash);
  onHash();
}
render();
if(COACH_MODE) initAI();
initCloud();
