import { useState, type FormEvent } from "react";
import "@/styles/pages/quickhelp&chatbot.css";

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
    <main className="contact-page">
      <div className="contact-support-wrapper">
        <h2>Contact &amp; Support</h2>
        <div className="contact-grid">
          {/* Left: contact details */}
          <div className="contact-left">
            <h3>Get in Touch</h3>
            <div>
              <h4>Campus Address</h4>
              <p>
                PUP Parañaque Campus Col. E. De Leon
                <br /> St. Wawa, Brgy. Sto. Niño Parañaque City, <br />
                Philippines 1700,
                <br />
                Metro Manila
              </p>
            </div>
            <div>
              <h4>Contact Numbers</h4>
              <p>
                <strong>Main Office:</strong> (02) 8839-0432
                <br />
                <strong>Admissions:</strong> (02) 8839-0433
                <br />
                <strong>Student Affairs:</strong> (02) 8839-0434
              </p>
            </div>
            <div>
              <h4>Email Addresses</h4>
              <p>
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
              <h4>Office Hours</h4>
              <p>
                Monday to Friday: 8:00 AM - 5:00 PM
                <br />
                Closed on Weekends and Holidays
              </p>
            </div>
          </div>

          {/* Right: message form */}
          <div className="contact-right">
            <h3>Send Us a Message</h3>
            <form onSubmit={handleSubmit}>
              <div>
                <label htmlFor="fullname">Full Name</label>
                <br />
                <input
                  id="fullname"
                  type="text"
                  placeholder="Juan dela Cruz"
                  className="form-input"
                  value={form.fullname}
                  onChange={(e) => update("fullname", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email">Email Address</label>
                <br />
                <input
                  id="email"
                  type="email"
                  placeholder="juandelacruz@example.com"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="subject">Subject</label>
                <br />
                <input
                  id="subject"
                  type="text"
                  placeholder="Inquiry about Admissions"
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="message">Message</label>
                <br />
                <textarea
                  id="message"
                  rows={6}
                  placeholder="Your message here..."
                  className="form-input"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                />
              </div>
              <button type="submit" className="submit-btn">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
