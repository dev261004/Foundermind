import NeuralBackground from "./NeuralBackground"

export default function Hero(){

return(

<section className="relative min-h-screen flex items-center justify-center">

<NeuralBackground/>

<div className="text-center max-w-4xl">

<h1 className="text-6xl font-bold">
Startup Intelligence
<br/>
<span className="gradient-text">
Powered by AI
</span>
</h1>

<p className="mt-6 text-gray-400">
Analyze markets, competitors and investors using AI.
</p>

<div className="mt-10 flex justify-center gap-6">

<button className="primary-btn">
Start Analysis
</button>

<button className="secondary-btn">
Login
</button>

</div>

</div>

</section>

)

}