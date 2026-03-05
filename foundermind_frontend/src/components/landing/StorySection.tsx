"use client"

import { motion } from "framer-motion"

const steps = [

{
title:"Submit Startup Idea",
desc:"Describe your startup concept and market."
},

{
title:"AI Market Analysis",
desc:"FounderMind analyzes market demand and opportunity."
},

{
title:"Competitor Intelligence",
desc:"Identify global and local competitors instantly."
},

{
title:"Funding Discovery",
desc:"Find investors and government grants."
}

]

export default function StorySection(){

return(

<section className="py-28 section-glow">

<div className="max-w-6xl mx-auto px-6">

<h2 className="text-4xl font-bold text-center mb-20">
How FounderMind Works
</h2>

<div className="grid md:grid-cols-2 gap-10">

{steps.map((step,i)=>(

<motion.div
key={i}
initial={{opacity:0,y:40}}
whileInView={{opacity:1,y:0}}
transition={{duration:.6}}
className="ai-card"
>

<span className="story-number">
{`0${i+1}`}
</span>

<h3 className="text-lg font-semibold">
{step.title}
</h3>

<p className="text-gray-400 mt-2">
{step.desc}
</p>

</motion.div>

))}

</div>

</div>

</section>

)

}