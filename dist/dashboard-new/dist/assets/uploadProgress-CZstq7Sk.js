const a="leka-upload-overlay",p="leka-upload-overlay-style",c=()=>{if(typeof document>"u")return null;if(!document.getElementById(p)){const t=document.createElement("style");t.id=p,t.textContent=`
      #${a} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2100;
        width: 320px;
        pointer-events: none;
        display: none;
      }
      #${a}.is-visible {
        display: block;
      }
      #${a} .leka-upload-card {
        pointer-events: auto;
        background: #0f172a;
        color: #f8fafc;
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35);
        border: 1px solid rgba(148, 163, 184, 0.2);
        font-family: 'Noto Sans Thai', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      #${a} .leka-upload-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #${a} .leka-upload-subtitle {
        font-size: 0.8rem;
        color: rgba(226, 232, 240, 0.75);
        margin-bottom: 12px;
      }
      #${a} .leka-upload-track {
        background: rgba(148, 163, 184, 0.2);
        border-radius: 9999px;
        height: 6px;
        overflow: hidden;
        position: relative;
      }
      #${a} .leka-upload-bar {
        background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
        height: 100%;
        width: 0%;
        border-radius: 9999px;
        transition: width 0.2s ease;
      }
      #${a} .leka-upload-bar.indeterminate {
        width: 40%;
        animation: lekaUploadIndeterminate 1.1s ease-in-out infinite;
      }
      @keyframes lekaUploadIndeterminate {
        0% { transform: translateX(-120%); }
        50% { transform: translateX(0%); }
        100% { transform: translateX(180%); }
      }
      #${a} .leka-upload-footer {
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        color: rgba(226, 232, 240, 0.8);
      }
      #${a} .leka-upload-percent {
        font-weight: 600;
        color: #93c5fd;
      }
    `,document.head.appendChild(t)}let e=document.getElementById(a);return e||(e=document.createElement("div"),e.id=a,e.innerHTML=`
      <div class="leka-upload-card">
        <div class="leka-upload-title" id="leka-upload-title">📤 กำลังอัปโหลดไฟล์</div>
        <div class="leka-upload-subtitle" id="leka-upload-subtitle">โปรดรอสักครู่</div>
        <div class="leka-upload-track">
          <div class="leka-upload-bar indeterminate" id="leka-upload-bar"></div>
        </div>
        <div class="leka-upload-footer">
          <span class="leka-upload-percent" id="leka-upload-percent">0%</span>
          <span id="leka-upload-detail">กำลังเตรียมไฟล์...</span>
        </div>
      </div>
    `,document.body.appendChild(e)),e},u=e=>{if(typeof e!="number"||Number.isNaN(e))return"-";if(e===0)return"0 Bytes";const t=1024,o=["Bytes","KB","MB","GB","TB"],n=Math.floor(Math.log(e)/Math.log(t));return`${(e/Math.pow(t,n)).toFixed(n===0?0:1)} ${o[n]}`},m=({title:e="📤 กำลังอัปโหลดไฟล์",subtitle:t="โปรดรอสักครู่"}={})=>{const o=c();if(!o)return;const n=document.getElementById("leka-upload-title"),s=document.getElementById("leka-upload-subtitle"),r=document.getElementById("leka-upload-percent"),l=document.getElementById("leka-upload-bar"),d=document.getElementById("leka-upload-detail");n&&(n.textContent=e),s&&(s.textContent=t||"โปรดรอสักครู่"),r&&(r.textContent="0%"),l&&(l.style.width="0%",l.classList.add("indeterminate")),d&&(d.textContent="กำลังเตรียมไฟล์..."),o.classList.add("is-visible")},f=({loaded:e=0,total:t=0,lengthComputable:o=!1,percent:n,detail:s}={})=>{const r=document.getElementById("leka-upload-percent"),l=document.getElementById("leka-upload-bar"),d=document.getElementById("leka-upload-detail");let i=typeof n=="number"?Math.round(n):null;i===null&&o&&t>0&&(i=Math.round(Math.max(0,Math.min(100,e/t*100)))),r&&i!==null&&(r.textContent=`${i}%`),l&&(i!==null?(l.classList.remove("indeterminate"),l.style.width=`${i}%`):l.classList.add("indeterminate")),d&&(s?d.textContent=s:o&&t>0&&(d.textContent=`${u(e)} / ${u(t)}`))},k=()=>{const e=document.getElementById(a);e&&e.classList.remove("is-visible")};export{k as h,m as s,f as u};
