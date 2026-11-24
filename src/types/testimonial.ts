export type TestimonialStatus = "active" | "inactive";

export interface Testimonial {
  _id: string;
  image: string;
  title: string;
  content: string;
  status: TestimonialStatus;
  createdAt?: string;
  updatedAt?: string;
}
