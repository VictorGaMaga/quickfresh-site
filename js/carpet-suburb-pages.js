(function(){
  function track(eventName,payload){
    var data=Object.assign({event:eventName,page:location.pathname},payload||{});
    if(window.dataLayer&&Array.isArray(window.dataLayer)){
      window.dataLayer.push(data);
    }
  }

  function $(id){return document.getElementById(id);}
  function txt(id){var el=$(id);return el?String(el.value||"").trim():"";}
  function setErr(id,msg){var el=$(id+"Error");if(el)el.textContent=msg||"";}
  function validEmail(v){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||"");}
  function sms(message){return "sms:+61451664247?&body="+encodeURIComponent(message);}
  function wa(message){return "https://wa.me/61451664247?text="+encodeURIComponent(message);}

  var body=document.body;
  var serviceLabel=body.getAttribute("data-service-label")||"carpet cleaning";
  var defaultSuburb=body.getAttribute("data-default-suburb")||"";
  var source=body.getAttribute("data-page-source")||"carpet-suburb-page-email-quote";
  var stickyEl=document.querySelector(".sticky");
  var heroEl=$("hero-section");
  var quoteEl=$("email-quote");

  function leadContext(){
    return {
      suburb:txt("emailQuoteSuburb")||defaultSuburb,
      day:txt("emailQuoteDay"),
      needs:txt("emailQuoteNeed")||serviceLabel,
      details:txt("emailQuoteDetails")
    };
  }

  function buildLeadMessage(ctx){
    var c=ctx||leadContext();
    var parts=["Hi QuickFresh, I'd like a quote for "+serviceLabel+"."];
    if(c.suburb){parts.push("Suburb: "+c.suburb+".");}
    if(c.day){parts.push("Preferred day: "+c.day+".");}
    if(c.needs&&c.needs!==serviceLabel){parts.push("Need: "+c.needs+".");}
    if(c.details){parts.push("Details: "+c.details+".");}
    return parts.join(" ");
  }

  function refreshLinks(){
    var message=buildLeadMessage();
    ["heroWhatsAppBtn","stickyWhatsApp","emailFallbackWa"].forEach(function(id){
      var el=$(id);
      if(el)el.href=wa(message);
    });
    ["heroSmsBtn","stickySms","emailFallbackSms"].forEach(function(id){
      var el=$(id);
      if(el)el.href=sms(message);
    });
  }

  function validateForm(showErrors){
    var ok=true;
    var email=txt("emailQuoteEmail");
    var mobile=txt("emailQuoteMobile");
    var suburb=txt("emailQuoteSuburb");
    var day=txt("emailQuoteDay");
    var need=txt("emailQuoteNeed");
    var details=txt("emailQuoteDetails");

    if(!validEmail(email)){ok=false;if(showErrors)setErr("emailQuoteEmail","Enter a valid email.");}else if(showErrors)setErr("emailQuoteEmail","");
    if(mobile&&mobile.replace(/\D/g,"").length<6){ok=false;if(showErrors)setErr("emailQuoteMobile","Enter at least 6 digits.");}else if(showErrors)setErr("emailQuoteMobile","");
    if(suburb.length<2){ok=false;if(showErrors)setErr("emailQuoteSuburb","Enter your suburb.");}else if(showErrors)setErr("emailQuoteSuburb","");
    if(!day){ok=false;if(showErrors)setErr("emailQuoteDay","Select preferred day.");}else if(showErrors)setErr("emailQuoteDay","");
    if(!need){ok=false;if(showErrors)setErr("emailQuoteNeed","Select what needs cleaning.");}else if(showErrors)setErr("emailQuoteNeed","");
    if(details.length<20){ok=false;if(showErrors)setErr("emailQuoteDetails","Please add at least 20 characters.");}else if(showErrors)setErr("emailQuoteDetails","");
    return ok;
  }

  function emailUiState(mode,msg){
    var status=$("emailQuoteStatus");
    var success=$("emailQuoteSuccess");
    var fallback=$("emailQuoteFallback");
    var fallbackText=$("emailQuoteFallbackText");
    if(status){status.hidden=true;status.textContent="";}
    if(success)success.hidden=true;
    if(fallback)fallback.hidden=true;
    if(mode==="sending"&&status){status.hidden=false;status.textContent="Sending...";}
    if(mode==="error"&&status){status.hidden=false;status.textContent=msg||"Could not send right now.";}
    if(mode==="success"&&success){success.hidden=false;}
    if(mode==="fallback"&&fallback){
      fallback.hidden=false;
      if(fallbackText)fallbackText.textContent=msg||"Could not send right now. You can send the same request via WhatsApp or SMS.";
    }
  }

  function resetForm(){
    var form=$("emailQuoteForm");
    if(form)form.reset();
    if($("emailQuoteSuburb"))$("emailQuoteSuburb").value=defaultSuburb;
    ["emailQuoteName","emailQuoteEmail","emailQuoteMobile","emailQuoteSuburb","emailQuoteDay","emailQuoteNeed","emailQuoteDetails"].forEach(function(id){setErr(id,"");});
    emailUiState();
    refreshLinks();
  }

  async function send(payload){
    try{
      var response=await fetch("/api/contact",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      var data=await response.json().catch(function(){return null;});
      if(!response.ok)return{ok:false,status:response.status,data:data};
      if(data&&data.ok===false)return{ok:false,status:response.status,data:data};
      return{ok:true,status:response.status,data:data};
    }catch(_){
      return{ok:false,status:"network"};
    }
  }

  async function submitEmailQuote(event){
    event.preventDefault();
    if(!validateForm(true))return;
    var submitBtn=$("emailQuoteSubmit");
    var payload={
      type:"quote",
      pageUrl:location.href,
      contactPref:"email",
      packageName:"",
      name:txt("emailQuoteName"),
      email:txt("emailQuoteEmail"),
      mobile:txt("emailQuoteMobile"),
      suburb:txt("emailQuoteSuburb"),
      preferredDay:txt("emailQuoteDay"),
      needsCleaning:txt("emailQuoteNeed"),
      details:txt("emailQuoteDetails"),
      estimateTotal:0,
      estimateSummary:"",
      packageInterest:"",
      message:buildLeadMessage(),
      source:source
    };

    if(submitBtn){submitBtn.disabled=true;submitBtn.textContent="Sending";}
    emailUiState("sending");
    track("email_quote_submit",{source:source});
    var result=await send(payload);
    if(submitBtn){submitBtn.disabled=false;submitBtn.textContent="Send my email quote request";}
    if(result.ok){
      emailUiState("success");
      track("email_quote_success",{source:source});
      return;
    }
    emailUiState("fallback","Could not send right now. You can send the same request via WhatsApp or SMS.");
    track("email_quote_fail",{source:source,statusCode:result.status});
  }

  function initAnchors(){
    document.querySelectorAll('a[href^="#"]').forEach(function(link){
      link.addEventListener("click",function(event){
        var id=(link.getAttribute("href")||"").slice(1);
        var target=id?document.getElementById(id):null;
        if(!target)return;
        event.preventDefault();
        target.scrollIntoView({behavior:"smooth",block:"start"});
      });
    });
  }

  function initFaq(){
    document.querySelectorAll("details.accordion").forEach(function(detail){
      var summary=detail.querySelector("summary");
      if(summary)summary.setAttribute("aria-expanded",detail.open?"true":"false");
      detail.addEventListener("toggle",function(){
        if(summary)summary.setAttribute("aria-expanded",detail.open?"true":"false");
      });
    });
  }

  function syncStickyHeight(){
    if(!stickyEl)return;
    document.documentElement.style.setProperty("--sticky-h",(stickyEl.offsetHeight||0)+"px");
  }

  function initSticky(){
    if(!stickyEl||!heroEl||!quoteEl)return;
    function updateStickyVisibility(){
      if(window.matchMedia("(min-width:760px)").matches){
        stickyEl.setAttribute("data-visible","false");
        document.body.classList.remove("has-sticky");
        return;
      }
      var heroBottom=heroEl.getBoundingClientRect().bottom;
      var quoteRect=quoteEl.getBoundingClientRect();
      var quoteVisible=quoteRect.top < window.innerHeight*0.65 && quoteRect.bottom > 0;
      var show=heroBottom <= 0 && !quoteVisible;
      stickyEl.setAttribute("data-visible",show?"true":"false");
      document.body.classList.toggle("has-sticky",show);
      if(show)syncStickyHeight();
    }

    window.addEventListener("scroll",updateStickyVisibility,{passive:true});
    window.addEventListener("resize",function(){
      syncStickyHeight();
      updateStickyVisibility();
    },{passive:true});
    syncStickyHeight();
    updateStickyVisibility();
  }

  function initTracking(){
    var heroWa=$("heroWhatsAppBtn");
    var heroSms=$("heroSmsBtn");
    var heroEmail=$("heroEmailLink");
    var stickyWa=$("stickyWhatsApp");
    var stickySms=$("stickySms");
    if(heroWa)heroWa.addEventListener("click",function(){track("hero_cta_click",{channel:"whatsapp"});});
    if(heroSms)heroSms.addEventListener("click",function(){track("hero_cta_click",{channel:"sms"});});
    if(heroEmail)heroEmail.addEventListener("click",function(){track("hero_cta_click",{channel:"email"});});
    if(stickyWa)stickyWa.addEventListener("click",function(){track("sticky_cta_click",{channel:"whatsapp"});});
    if(stickySms)stickySms.addEventListener("click",function(){track("sticky_cta_click",{channel:"sms"});});
  }

  function init(){
    refreshLinks();
    initAnchors();
    initFaq();
    initSticky();
    initTracking();
    var form=$("emailQuoteForm");
    if(form)form.addEventListener("submit",submitEmailQuote);
    var reset=$("emailQuoteReset");
    if(reset)reset.addEventListener("click",function(event){
      event.preventDefault();
      resetForm();
    });
    ["emailQuoteName","emailQuoteEmail","emailQuoteMobile","emailQuoteSuburb","emailQuoteDay","emailQuoteNeed","emailQuoteDetails"].forEach(function(id){
      var el=$(id);
      if(!el)return;
      el.addEventListener("input",function(){
        refreshLinks();
        if(id.indexOf("emailQuote")===0)validateForm(true);
      });
      el.addEventListener("change",function(){
        refreshLinks();
        if(id.indexOf("emailQuote")===0)validateForm(true);
      });
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }
})();
