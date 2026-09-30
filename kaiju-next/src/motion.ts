/** Short navigation motion plus a bounded set of visible CSS ambient instruments. */
export class PanelMotion {
  private readonly animations=new Map<Element,Animation>();
  private readonly lifetime=new AbortController();
  private readonly reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  private mode:"auto"|"calm"|"off"="auto";
  private readonly visible=new Set<Element>();
  private destroyed=false;
  private readonly ambient:IntersectionObserver;
  constructor(private readonly root:HTMLElement) {
    this.ambient=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.isIntersecting)this.visible.add(entry.target);else this.visible.delete(entry.target)}
      this.syncAmbient();
    },{root,threshold:.15});
    this.reduced.addEventListener("change",()=>this.sync(),{signal:this.lifetime.signal});
    document.addEventListener("visibilitychange",()=>this.sync(),{signal:this.lifetime.signal});
    this.sync();
  }
  private sync():void {this.root.dataset.motion=this.enabled?this.mode:"off";if(!this.enabled)this.stop();this.syncAmbient()}
  private syncAmbient():void {
    const allowed=this.enabled && this.mode==="auto" && !this.root.querySelector(".kaiju-dialog-backdrop");
    for(const card of this.root.querySelectorAll<HTMLElement>(".kaiju-channel,.kaiju-photo"))card.classList.toggle("is-ambient-active",allowed && this.visible.has(card));
  }
  clearAmbient():void {this.ambient.disconnect();this.visible.clear();for(const card of this.root.querySelectorAll(".is-ambient-active"))card.classList.remove("is-ambient-active")}
  observeAmbient():void {
    this.clearAmbient();
    for(const card of this.root.querySelectorAll<HTMLElement>(".kaiju-channel,.kaiju-photo")) {
      card.style.setProperty("--scan-travel",`${Math.max(0,card.clientHeight+70)}px`);
      const meter=card.querySelector<HTMLElement>(".kaiju-channel-progress");
      card.style.setProperty("--meter-travel",`${Math.max(0,(meter?.clientWidth??0)-4)*Number(meter?.getAttribute("aria-valuenow")??0)/100+44}px`);
      this.ambient.observe(card);
    }
    this.syncAmbient();
  }
  get enabled():boolean{return !this.destroyed && this.mode!=="off" && !this.reduced.matches && !document.hidden}
  setMode(mode:"auto"|"calm"|"off"):void {this.mode=mode;this.sync()}
  stop():void {for(const animation of this.animations.values())animation.cancel();this.animations.clear()}
  destroy():void {this.destroyed=true;this.root.dataset.motion="off";this.stop();this.clearAmbient();this.lifetime.abort()}
  animate(element:Element|null,frames:Keyframe[],duration=240,delay=0):void {
    if(!element || !this.enabled || typeof element.animate!=="function")return;
    this.animations.get(element)?.cancel();
    const animation=element.animate(frames,{duration,delay,easing:"cubic-bezier(0.22, 1, 0.36, 1)",fill:"backwards"});
    this.animations.set(element,animation);
    animation.finished.then(()=>{if(this.animations.get(element)===animation){animation.cancel();this.animations.delete(element)}}).catch(()=>{});
  }
  enter(reason:"initial"|"tab"|"record"|"dialog"|"refresh",direction=1):void {
    if(reason==="initial")this.animate(this.root.querySelector(".kaiju-app"),[{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],300);
    if(reason==="initial" || reason==="tab" || reason==="record") {
      const cards=this.root.querySelectorAll(".kaiju-channel,.kaiju-stage-column,.kaiju-record-form,.kaiju-axis,.kaiju-empty");
      cards.forEach((card,index)=>this.animate(card,[{opacity:0,transform:`translate${reason==="tab"?"X":"Y"}(${reason==="tab"?direction*10:8}px)`},{opacity:1,transform:"none"}],280,Math.min(index,2)*35));
      if(reason==="initial" || reason==="record") {
        this.animate(this.root.querySelector(".kaiju-photo-corners"),[{opacity:0,transform:"scale(.985)"},{opacity:.65,transform:"none"}],400,100);
        this.root.querySelectorAll<HTMLElement>("[data-meter-fill]").forEach((fill,index)=>{
          this.animate(fill.querySelector(".kaiju-meter-reveal"),[{transform:"translateX(0)"},{transform:"translateX(100%)"}],400,index*40);
        });
        if(reason==="record")this.feedback(this.root.querySelector(".kaiju-record-header h1"));
      }
      if(!cards.length)this.animate(this.root.querySelector(".kaiju-body"),[{opacity:.4,transform:"translateY(6px)"},{opacity:1,transform:"none"}],220);
    }
    if(reason==="dialog") {
      this.animate(this.root.querySelector(".kaiju-dialog-backdrop"),[{opacity:0},{opacity:1}],160);
      this.animate(this.root.querySelector(".kaiju-create-form"),[{opacity:0,transform:"translateY(12px) scale(.98)"},{opacity:1,transform:"none"}],280);
    }
  }
  indicator(oldRect?:DOMRect):void {
    const indicator=this.root.querySelector<HTMLElement>(".kaiju-tab-indicator"),tab=this.root.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    for(const card of this.root.querySelectorAll<HTMLElement>(".kaiju-channel,.kaiju-photo")) {
      card.style.setProperty("--scan-travel",`${Math.max(0,card.clientHeight+70)}px`);
      const meter=card.querySelector<HTMLElement>(".kaiju-channel-progress");
      card.style.setProperty("--meter-travel",`${Math.max(0,(meter?.clientWidth??0)-4)*Number(meter?.getAttribute("aria-valuenow")??0)/100+44}px`);
    }
    if(!indicator || !tab)return;
    indicator.style.left=`${tab.offsetLeft}px`;indicator.style.width=`${tab.offsetWidth}px`;
    if(oldRect) {const next=indicator.getBoundingClientRect();if(next.width)this.animate(indicator,[{transform:`translateX(${oldRect.left-next.left}px) scaleX(${oldRect.width/next.width})`},{transform:"none"}],280)}
  }
  feedback(element:Element|null):void {this.animate(element,[{opacity:.5,transform:"translateY(2px) scale(.96)"},{opacity:1,transform:"translateY(0) scale(1.02)",offset:.6},{opacity:1,transform:"none"}],300)}
}
