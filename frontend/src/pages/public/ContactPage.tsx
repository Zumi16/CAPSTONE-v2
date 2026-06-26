import { useState, type FormEvent } from "react";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-maroon focus:ring-2 focus:ring-maroon/20";

/**
 * Contact & Support page. The chatbot itself lives in the shared layout, so
 * this page just renders the campus contact details and the message form.
 * (The original form had no backend, so we show a confirmation on submit.)
 */
export function ContactPage() {
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    subject: "",
    message: "",
  });

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    window.alert(
      "Thank you for your message! Our team will get back to you shortly.",
    );
    setForm({ fullname: "", email: "", subject: "", message: "" });
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h2 className="mb-8 text-2xl font-extrabold text-maroon-dark">
        Contact &amp; Support
      </h2>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left: contact details */}
        <div className="w-full lg:w-1/2">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">Get in Touch</h3>

          <div className="space-y-6 text-gray-700">
            <div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">
                Campus Address
              </h4>
              <p>
                PUP Parañaque Campus Col. E. De Leon
                <br /> St. Wawa, Brgy. Sto. Niño Parañaque City, <br />
                Philippines 1700, <br />
                Metro Manila
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">
                Contact Numbers
              </h4>
              <p>
                <strong>Main Office:</strong> (02) 8839-0432
                <br />
                <strong>Admissions:</strong> (02) 8839-0433
                <br />
                <strong>Student Affairs:</strong> (02) 8839-0434
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">
                Email Addresses
              </h4>
              <p className="break-words">
                <strong>Registrar Office:</strong> paranaque.registrar@pup.edu.ph
                <br />
                <strong>Student Services:</strong>{" "}
                paranaque.studentservices@pup.edu.ph
                <br />
                <strong>Academic:</strong> paranaque.academic@pup.edu.ph
                <br />
                <strong>Director:</strong> paranaque.director@pup.edu.ph
              </p>
            </div>
            <div>
              <h4 className="mb-2 text-lg font-semibold text-gray-900">
                Office Hours
              </h4>
              <p>
                Monday to Friday: 8:00 AM - 5:00 PM
                <br />
                Saturday: 8:00 AM - 12:00 NN
                <br />
                Closed on Sundays and Holidays
              </p>
            </div>
          </div>
        </div>

        {/* Right: message form */}
        <div className="w-full lg:w-1/2">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            Send Us a Message
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullname" className="mb-1 block text-gray-700">
                Full Name
              </label>
              <input
                id="fullname"
                type="text"
                placeholder="Juan dela Cruz"
                className={inputClass}
                value={form.fullname}
                onChange={(e) => update("fullname", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="juandelacruz@example.com"
                className={inputClass}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="subject" className="mb-1 block text-gray-700">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                placeholder="Inquiry about Admissions"
                className={inputClass}
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-1 block text-gray-700">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                placeholder="Your message here..."
                className={inputClass}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-maroon-dark px-6 py-2.5 font-semibold text-white transition hover:bg-maroon"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
