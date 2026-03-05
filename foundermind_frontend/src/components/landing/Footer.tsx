"use client"

import { Github, Twitter, Linkedin } from "lucide-react"

export default function Footer() {

return (

<footer className="relative mt-32 border-t border-white/10">

{/* glow background */}

<div className="footer-glow absolute inset-0 -z-10"/>

<div className="max-w-7xl mx-auto px-6 py-16">

<div className="grid md:grid-cols-4 gap-12">

{/* brand */}

<div>

<h3 className="text-xl font-semibold gradient-text mb-4">
FounderMind
</h3>

<p className="text-sm text-gray-400 leading-relaxed max-w-sm">
AI-powered startup intelligence platform helping founders
analyze markets, discover investors and validate ideas.
</p>

<div className="flex gap-4 mt-6 text-gray-400">

<Twitter size={18}/>
<Github size={18}/>
<Linkedin size={18}/>

</div>

</div>

{/* product */}

<div>

<h4 className="footer-heading">
Product
</h4>

<ul className="footer-links">

<li>Market Intelligence</li>
<li>Competitor Analysis</li>
<li>Investor Discovery</li>
<li>Startup Forecasting</li>

</ul>

</div>

{/* resources */}

<div>

<h4 className="footer-heading">
Resources
</h4>

<ul className="footer-links">

<li>Documentation</li>
<li>Startup Guides</li>
<li>Government Grants</li>
<li>Blog</li>

</ul>

</div>

{/* company */}

<div>

<h4 className="footer-heading">
Company
</h4>

<ul className="footer-links">

<li>About</li>
<li>Contact</li>
<li>Privacy Policy</li>
<li>Terms of Service</li>

</ul>

</div>

</div>

{/* bottom bar */}

<div className="border-t border-white/10 mt-14 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">

<p>
© {new Date().getFullYear()} FounderMind AI. All rights reserved.
</p>

<p className="mt-2 md:mt-0">
Built for founders and builders.
</p>

</div>

</div>

</footer>

)
}