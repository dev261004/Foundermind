/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useCallback } from "react"
import Particles from "react-tsparticles"
import { loadSlim } from "tsparticles-slim"

export default function AiBackground() {

const particlesInit = useCallback(async (engine:any) => {
  await loadSlim(engine)
}, [])

return (

<div className="absolute inset-0 -z-10">

<Particles
id="tsparticles"
init={particlesInit}

options={{

fullScreen:false,

fpsLimit:60,

particles:{

number:{
value:80
},

color:{
value:"#7c3aed"
},

links:{
enable:true,
distance:140,
color:"#7c3aed",
opacity:0.25,
width:1
},

move:{
enable:true,
speed:0.7
},

opacity:{
value:0.6
},

size:{
value:{min:1,max:3}
}

},

interactivity:{

events:{
onHover:{
enable:true,
mode:"grab"
}
},

modes:{
grab:{
distance:160
}
}

},

detectRetina:true

}}
/>

</div>

)

}