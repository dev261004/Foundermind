"use client"

import { motion } from "framer-motion"
import { LineChart, Rocket, Users, Brain } from "lucide-react"

const features = [
{
title:"Market Opportunity Modeling",
desc:"AI calculates TAM, SAM and SOM instantly.",
icon:LineChart
},
{
title:"Investor Discovery",
desc:"Find investors aligned with your startup.",
icon:Rocket
},
{
title:"Competitor Intelligence",
desc:"Analyze global and local competitors.",
icon:Users
},
{
title:"Predictive Market AI",
desc:"Forecast startup market growth.",
icon:Brain
}
]

export default function Features(){

return(

<section className="py-32 relative">

<div className="features-glow absolute inset-0 -z-10"/>

<div className="max-w-6xl mx-auto px-6">

<h2 className="features-title">
Startup Intelligence Tools
</h2>

<div className="grid md:grid-cols-2 gap-10 mt-20">

{features.map((feature,i)=>{

const Icon = feature.icon

return(

<motion.div
key={i}
whileHover={{scale:1.03,y:-6}}
className="feature-ai-card"
>

<div className="feature-icon-wrapper">
<Icon size={22}/>
</div>

<h3 className="feature-title">
{feature.title}
</h3>

<p className="feature-desc">
{feature.desc}
</p>

</motion.div>

)

})}

</div>

</div>

</section>

)

}