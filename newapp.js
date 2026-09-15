
const materials=[
{id:"iron",group:"Ferrous",name:"Iron",icon:"🔩",rate:38,unit:"kg",trend:"up",delta:"+₹2"},
{id:"steel",group:"Ferrous",name:"Steel",icon:"🏗️",rate:42,unit:"kg",trend:"flat",delta:"steady"},
{id:"aluminium",group:"Non-Ferrous",name:"Aluminium",icon:"🥫",rate:155,unit:"kg",trend:"up",delta:"+₹5"},
{id:"copper",group:"Non-Ferrous",name:"Copper",icon:"🟠",rate:690,unit:"kg",trend:"up",delta:"+₹12"},
{id:"brass",group:"Non-Ferrous",name:"Brass",icon:"🟡",rate:510,unit:"kg",trend:"flat",delta:"steady"},
{id:"lithium",group:"Critical Minerals",name:"Lithium-bearing battery",icon:"🔋",rate:125,unit:"kg",trend:"up",delta:"+₹4"},
{id:"magnet",group:"Critical Minerals",name:"Magnet / rare-earth bearing",icon:"🧲",rate:180,unit:"kg",trend:"flat",delta:"indicative"},
{id:"pcb",group:"E-Waste",name:"PCB",icon:"🟩",rate:310,unit:"kg",trend:"up",delta:"+₹8"},
{id:"cable",group:"E-Waste",name:"Copper cable & wire",icon:"🔌",rate:265,unit:"kg",trend:"up",delta:"+₹6"},
{id:"panel",group:"E-Waste",name:"LCD / LED panel",icon:"🖥️",rate:72,unit:"kg",trend:"flat",delta:"steady"},
{id:"battery",group:"E-Waste",name:"Battery",icon:"🔋",rate:92,unit:"kg",trend:"down",delta:"−₹3"},
{id:"mixedmetal",group:"Mixed Scrap",name:"Mixed metal",icon:"🧰",rate:55,unit:"kg",trend:"flat",delta:"steady"}
];
const facilities=[
{name:"GreenLoop Materials",type:"Authorized Recycler",dist:"8 km",rate:320,auth:"Authorization verified",score:96,pickup:true,materials:"E-waste • PCB • Cable"},
{name:"Shakti Metal Recovery",type:"Authorized Processor",dist:"12 km",rate:48,auth:"Authorization verified",score:92,pickup:true,materials:"Iron • Steel • Aluminium"},
{name:"UrbanMet Secondarys",type:"Aggregator",dist:"5 km",rate:44,auth:"Registration verified",score:88,pickup:false,materials:"Ferrous • Mixed metal"},
{name:"Circular Minerals Hub",type:"Authorized Processor",dist:"21 km",rate:710,auth:"Authorization verified",score:94,pickup:true,materials:"Copper • Critical mineral streams"}
];
const state={lots:JSON.parse(localStorage.getItem("um_lots")||"[]"),lang:localStorage.getItem("um_lang")||"Hindi"};
function save(){localStorage.setItem("um_lots",JSON.stringify(state.lots))}
function fmt(n){return "₹"+Number(n).toLocaleString("en-IN")}
function speak(t){if("speechSynthesis" in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(t);u.lang=state.lang==="Marathi"?"mr-IN":"hi-IN";speechSynthesis.speak(u)}}
function shell(active){
document.write(`<header class="topbar"><a class="brand" href="index.html"><span class="brandmark">♻</span><span>Urban Mining Connect</span></a><div class="profile"><span class="badge blue">SECONDARY RAW MATERIALS</span><span class="avatar">C</span></div></header><nav class="nav">
<a href="index.html" class="${active==="Home"?"active":""}">⌂ Home</a><a href="capture.html" class="${active==="Capture"?"active":""}">＋ Capture</a><a href="materials.html" class="${active==="Materials"?"active":""}">◈ Materials</a><a href="prices.html" class="${active==="Valuation"?"active":""}">₹ Valuation</a><a href="matches.html" class="${active==="Buyers"?"active":""}">✓ Buyers</a><a href="handover.html" class="${active==="Traceability"?"active":""}">⌁ Traceability</a><a href="recovery.html" class="${active==="Recovery"?"active":""}">◔ Recovery</a><a href="earnings.html" class="${active==="Earnings"?"active":""}">▣ Ledger</a></nav>`)
}
function footer(){document.write(`<footer class="footer">Urban Mining Connect • Team HEISENBUG </footer>`)}
