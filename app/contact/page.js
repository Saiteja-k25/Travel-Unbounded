import { Clock, Mail, Phone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Container from "@/components/Container";
import EnquiryForm from "@/components/EnquiryForm";
import { offices } from "@/data/offices";
import { parseChatPrefill } from "@/lib/prefillFromChat";
import { getDestinationNames } from "@/lib/destinations";

// Destinations are editable from the admin dashboard, so this page reads them
// per request rather than being baked in at build time. Without this, adding a
// destination would not appear in the enquiry form until the next deploy.
export const dynamic = "force-dynamic";

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

// Sarathi's "Request a callback" button links here with what it worked out
// during the chat. searchParams is a promise in this version of Next, so the
// page is async. parseChatPrefill re-validates every value - the URL is
// visitor-editable, so nothing in it is trusted.
export default async function ContactPage({ searchParams }) {
  const params = (await searchParams) ?? {};

  // Read from the database here, on the server, and hand the plain list down.
  // The form needs it for its dropdown, and parseChatPrefill needs it to turn
  // the chat's free text into a real destination name.
  const destinationNames = await getDestinationNames();

  const prefill = parseChatPrefill(params, destinationNames);
  const isPrefilled = Object.keys(prefill).length > 0;

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="Plan your trip"
        title="Tell us where you want to wake up"
        description="Share a few details and one of our travel experts will come back to you within 24 hours with a route worth taking."
        image="https://images.unsplash.com/photo-1532154066703-3973764c81fe?auto=format&fit=crop&w=2000&q=70"
        imageAlt="Paper travel maps spread across a table"
      />

      <section className="bg-forest-900 py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1.5fr_340px] lg:gap-16">
            {/* The form itself */}
            <div>
              <h2 className="font-serif text-2xl text-bone sm:text-3xl">
                Booking enquiry
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-forest-200">
                Fields marked with an asterisk are required. Nothing is booked
                at this stage &mdash; this simply starts the conversation.
              </p>

              {/* Says plainly where the values came from, so a visitor is not
                  surprised to find fields already filled in, and knows they
                  can be changed. */}
              {isPrefilled && (
                <p className="mt-5 rounded-lg border border-forest-700 bg-forest-800/40 px-4 py-3 text-sm leading-relaxed text-forest-100">
                  We have carried a few details across from your chat with
                  Sarathi. Please check them and change anything that is not
                  right.
                </p>
              )}

              <div className="mt-8">
                <EnquiryForm
                  initialValues={prefill}
                  destinationNames={destinationNames}
                />
              </div>
            </div>

            {/* Supporting contact information */}
            <aside className="space-y-6">
              <div className="rounded-2xl border border-forest-700 bg-forest-800/40 p-7">
                <h2 className="font-serif text-xl text-bone">
                  Prefer to talk?
                </h2>

                <ul className="mt-5 space-y-5">
                  {contactDetails.map((detail) => {
                    const Icon = detail.icon;
                    return (
                      <li key={detail.label} className="flex gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-800 text-clay-300">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-forest-400">
                            {detail.label}
                          </p>
                          <p className="text-sm font-medium text-forest-100">
                            {detail.value}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-forest-700 bg-forest-800/20 p-7">
                <h2 className="font-serif text-xl text-bone">
                  Visit an office
                </h2>

                <ul className="mt-5 space-y-5">
                  {offices.map((office) => (
                    <li key={office.id}>
                      <p className="text-sm font-medium text-bone">
                        {office.city}
                      </p>
                      <address className="mt-1 space-y-0.5 text-sm not-italic leading-relaxed text-forest-300">
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
