import { type Content } from "@prismicio/client"
import { type SliceComponentProps } from "@prismicio/react"
import { type FC } from "react"

/**
 * Props for `Hero`.
 */
export type HeroProps = SliceComponentProps<Content.HeroSlice>

/**
 * Component for "Hero" Slices.
 */
const Hero: FC<HeroProps> = ({ slice }) => {
	return (
		<section
			data-slice-type={slice.slice_type}
			data-slice-variation={slice.variation}
		>
			<h2>Hero Slice</h2>
			<p>
				This is the Hero slice component with the {slice.variation} variation.
			</p>
		</section>
	)
}

export default Hero
