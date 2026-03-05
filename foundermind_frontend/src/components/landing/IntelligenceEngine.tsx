"use client"

export default function IntelligenceEngine(){

return(

<section className="pt-32 pb-8 text-center section-glow">
<h2 className="text-5xl font-bold mb-20">
FounderMind Intelligence Engine
</h2>

<div className="relative w-[700px] h-[500px] mx-auto">

<svg className="absolute inset-0 w-full h-full">

<line x1="350" y1="50" x2="150" y2="200" className="engine-line"/>
<line x1="350" y1="50" x2="550" y2="200" className="engine-line"/>
<line x1="150" y1="200" x2="350" y2="350" className="engine-line"/>
<line x1="550" y1="200" x2="350" y2="350" className="engine-line"/>
<line x1="350" y1="350" x2="350" y2="450" className="engine-line"/>

</svg>

<div className="engine-node" style={{left:"50%",top:"10%"}}>
Market Models
</div>

<div className="engine-node" style={{left:"20%",top:"40%"}}>
Competitor AI
</div>

<div className="engine-node" style={{left:"80%",top:"40%"}}>
Investor Matching
</div>

<div className="engine-node" style={{left:"50%",top:"70%"}}>
Startup Forecast
</div>

<div className="engine-node" style={{left:"50%",top:"90%"}}>
Pitch Builder
</div>

</div>

</section>

)

}