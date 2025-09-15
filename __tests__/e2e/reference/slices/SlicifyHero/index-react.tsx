import React from "react"

export function HeroSection() {
	return (
		<section className="box-border">
			<div className="relative bg-white box-border isolate overflow-hidden">
				<div className="box-border max-w-screen-xl text-center mx-auto pt-20 pb-16 px-4 md:pt-32 md:px-8">
					<h1 className="text-slate-900 text-5xl font-medium box-border tracking-[-1.2px] leading-[56px] max-w-4xl mx-auto font-lexend md:text-7xl md:tracking-[-1.8px] md:leading-[79.2px]">
						Slices{" "}
						<span className="relative text-blue-600 text-5xl box-border tracking-[-1.2px] leading-[56px] text-nowrap md:text-7xl md:tracking-[-1.8px] md:leading-[79.2px]">
							<img
								src="https://c.animaapp.com/mer9mbk1EAsxu5/assets/icon-3.svg"
								alt="Icon"
								className="absolute text-5xl box-border h-[27.84px] tracking-[-1.2px] leading-[56px] text-nowrap w-full left-0 top-[66.6667%] md:text-7xl md:h-[41.76px] md:tracking-[-1.8px] md:leading-[79.2px]"
							/>
							<span className="relative text-5xl box-border tracking-[-1.2px] leading-[56px] text-nowrap md:text-7xl md:tracking-[-1.8px] md:leading-[79.2px]">
								made simple
							</span>
						</span>{" "}
						for all businesses.
					</h1>
					<p className="text-slate-900 text-lg box-border tracking-[-0.45px] leading-8 max-w-screen-sm mt-6 mx-auto">
						From Figma components to Javascript components to reusable website
						sections. Bring your website builder to life with Slices.
					</p>
					<div className="box-border gap-x-6 flex justify-center mt-10">
						<a
							href="https://www.youtube.com/watch?v=IIsvqQ_LLwM"
							className="text-slate-700 text-sm items-center shadow-[rgb(255,255,255)_0px_0px_0px_0px,rgb(51,65,85)_0px_0px_0px_1px,rgba(0,0,0,0)_0px_0px_0px_0px] box-border flex justify-center px-4 py-2 rounded-full"
						>
							<img
								src="https://c.animaapp.com/mer9mbk1EAsxu5/assets/icon-4.svg"
								alt="Icon"
								className="box-border shrink-0 h-3 w-3"
							/>
							<span className="box-border block ml-3">Crash course</span>
						</a>
						<a
							href="https://prismic.io/slice-machine"
							className="text-white text-sm font-semibold items-center bg-slate-900 box-border flex justify-center px-4 py-2 rounded-full"
						>
							Build slices
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}
