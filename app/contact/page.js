import { Clock, Mail, Phone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import EnquiryForm from "@/components/EnquiryForm";
import { offices } from "@/data/offices";

export const metadata = {
  title: "Plan Your Trip | Travel Unbounded",
  description:
    "Tell us where you want to go and who is travelling. Our travel experts respond to every enquiry within 24 hours.",
};

const contactDetails = [
  { icon: Phone, label: "Call us", value: "+91 98450 00000" },
  { icon: Mail, label: "Email us", value: "hello@travelunbounded.com" },
  { icon: Clock, label: "Office hours", value: "Mon to Sat, 9am to 7pm IST" },
];

export default function ContactPage() {
  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="Plan your trip"
        title="Tell us where you want to wake up"
        description="Share a few details and one of our travel experts will come back to you within 24 hours with a route worth taking."
        image="https://images.unsplash.com/photo-1619837374214-f5b9eb80876d?auto=format&fit=crop&w=2000&q=70"
        imageAlt="Turquoise rivers meeting between mountains in Ladakh"
      />

      <section className="py-16 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-14">
            {/* The form itself */}
            <div>
              <h2 className="font-serif text-2xl text-forest-800 sm:text-3xl">
                Booking enquiry
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
                Fields marked with an asterisk are required. Nothing is booked
                at this stage &mdash; this simply starts the conversation.
              </p>

              <div className="mt-8">
                <EnquiryForm />
              </div>
            </div>

            {/* Supporting contact information */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-sand bg-white p-7">
                <h2 className="font-serif text-xl text-forest-800">
                  Prefer to talk?
                </h2>

                <ul className="mt-5 space-y-5">
                  {contactDetails.map((detail) => {
                    const Icon = detail.icon;
                    return (
                      <li key={detail.label} className="flex gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-ink-soft">
                            {detail.label}
                          </p>
                          <p className="text-sm font-medium text-ink">
                            {detail.value}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-sand bg-sand/40 p-7">
                <h2 className="font-serif text-xl text-forest-800">
                  Visit an office
                </h2>

                <ul className="mt-5 space-y-5">
                  {offices.map((office) => (
                    <li key={office.id}>
                      <p className="text-sm font-medium text-ink">
                        {office.city}
                      </p>
                      <address className="mt-1 space-y-0.5 text-sm not-italic leading-relaxed text-ink-soft">
                        {office.addressLines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </address>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}
