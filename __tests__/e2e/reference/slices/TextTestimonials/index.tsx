import { type Content, isFilled } from "@prismicio/client"
import { PrismicNextImage } from "@prismicio/next"
import { PrismicRichText, type SliceComponentProps } from "@prismicio/react"
import { FC } from "react"

type TestimonialsProps = SliceComponentProps<Content.TestimonialsSlice>

const Testimonials: FC<TestimonialsProps> = ({ slice }) => {
	return (
		<section className="px-6 py-20 md:py-28">
			<div className="mx-auto w-full max-w-6xl grid gap-8">
				{isFilled.richText(slice.primary.title) && (
					<div className="text-center">
						<PrismicRichText
							field={slice.primary.title}
							components={{
								heading2: ({ children }) => (
									<h2 className="mb-7 mt-12 first:mt-0 last:mb-0">
										{children}
									</h2>
								),
							}}
						/>
					</div>
				)}

				{isFilled.group(slice.primary.testimonials) && (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{slice.primary.testimonials.map((testimonial, index) => (
							<TestimonialCard key={index} testimonial={testimonial} />
						))}
					</div>
				)}
			</div>
		</section>
	)
}

type TestimonialCardProps = {
	testimonial: Content.TestimonialsSliceDefaultPrimaryTestimonialsItem
}

const TestimonialCard: FC<TestimonialCardProps> = ({ testimonial }) => {
	return (
		<div className="rounded-lg bg-white p-6 shadow-md border border-gray-200">
			<div className="mb-4">
				{isFilled.richText(testimonial.review) && (
					<div className="mb-4 text-gray-700">
						<PrismicRichText field={testimonial.review} />
					</div>
				)}

				{isFilled.number(testimonial.rating) && (
					<div className="mb-4">
						<Stars rating={testimonial.rating} />
					</div>
				)}
			</div>

			<div className="flex items-center gap-4">
				{isFilled.image(testimonial.customerPhoto) && (
					<PrismicNextImage
						field={testimonial.customerPhoto}
						className="h-12 w-12 rounded-full object-cover"
					/>
				)}

				<div className="flex-1">
					<div className="flex flex-col">
						{isFilled.keyText(testimonial.customerName) && (
							<div className="font-semibold text-gray-900">
								{testimonial.customerName}
							</div>
						)}

						{isFilled.keyText(testimonial.company) && (
							<div className="text-sm text-gray-600">{testimonial.company}</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

type StarsProps = {
	rating: Content.TestimonialsSliceDefaultPrimaryTestimonialsItem["rating"]
}

const Stars: FC<StarsProps> = ({ rating }) => {
	if (!rating) return null

	return (
		<div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
			{[...Array(5)].map((_, i) => (
				<svg
					key={i}
					className={`h-5 w-5 ${
						i < rating ? "text-yellow-400" : "text-gray-300"
					}`}
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
				</svg>
			))}
		</div>
	)
}

export default Testimonials
