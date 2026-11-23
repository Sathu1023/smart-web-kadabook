import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Globe2,
  Info,
  MessageCircle,
  Smartphone,
  Store,
  X,
} from "lucide-react";
import "./contact-dialog.css";

export default function ContactDialog({ open, onClose, whatsappNumber }) {
  const dialogRef = useRef(null);
  const id = useId();
  const [shopType, setShopType] = useState("Retail shop");
  const [language, setLanguage] = useState("English");

  const normalizedNumber =
    typeof whatsappNumber === "string" || typeof whatsappNumber === "number"
      ? String(whatsappNumber).replace(/\s+/g, "").replace(/^\+/, "")
      : "";
  const hasWhatsApp = /^\d{7,15}$/.test(normalizedNumber);
  const message = `Hello KadaBook! I'd like to get my shop started. Shop type: ${shopType}. Preferred language: ${language}.`;
  const whatsappUrl = hasWhatsApp
    ? `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`
    : null;

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="contact-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => event.preventDefault()}
    >
      <div className="contact-panel">
        <div className="contact-topline">
          <span className="contact-eyebrow">A simpler way to start</span>
          <button
            className="contact-close"
            type="button"
            aria-label="Close contact dialog"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="contact-emblem" aria-hidden="true">
          <Store size={28} strokeWidth={1.6} />
        </div>
        <h2 className="contact-title" id={`${id}-title`}>
          Let’s get your shop started.
        </h2>
        <p className="contact-description" id={`${id}-description`}>
          Choose your shop type and language to start a conversation with
          KadaBook.
        </p>

        <div className="contact-fields">
          <div className="contact-field">
            <label className="contact-label" htmlFor={`${id}-shop`}>
              <Store size={15} aria-hidden="true" />
              Shop type
            </label>
            <div className="contact-select-wrap">
              <select
                className="contact-select"
                id={`${id}-shop`}
                value={shopType}
                onChange={(event) => setShopType(event.target.value)}
              >
                <option>Retail shop</option>
                <option>Restaurant</option>
                <option>Kitchen</option>
              </select>
              <ChevronDown
                className="contact-chevron"
                size={17}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="contact-field">
            <label className="contact-label" htmlFor={`${id}-language`}>
              <Globe2 size={15} aria-hidden="true" />
              Preferred language
            </label>
            <div className="contact-select-wrap">
              <select
                className="contact-select"
                id={`${id}-language`}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option>English</option>
                <option>Tamil</option>
                <option>Sinhala</option>
              </select>
              <ChevronDown
                className="contact-chevron"
                size={17}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {!hasWhatsApp && (
          <div className="contact-notice" id={`${id}-notice`} role="status">
            <Info
              className="contact-notice-icon"
              size={18}
              aria-hidden="true"
            />
            <div className="contact-notice-copy">
              <p className="contact-notice-title">
                WhatsApp contact hasn’t been added yet.
              </p>
              <p className="contact-notice-description">
                A contact number is needed before enquiries can be sent.
              </p>
            </div>
          </div>
        )}

        <div className="contact-actions">
          {hasWhatsApp ? (
            <a
              className="contact-primary"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={`${id}-link-note`}
            >
              <MessageCircle size={19} aria-hidden="true" />
              <span>Continue on WhatsApp</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ) : (
            <button
              className="contact-primary"
              type="button"
              disabled
              aria-describedby={`${id}-notice`}
            >
              <MessageCircle size={19} aria-hidden="true" />
              <span>Continue on WhatsApp</span>
            </button>
          )}
          <button className="contact-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="contact-footer">
          <span className="contact-android-badge">
            <Smartphone size={13} aria-hidden="true" />
            Android
          </span>
          <p className="contact-footnote" id={`${id}-link-note`}>
            {hasWhatsApp
              ? "Opens WhatsApp in a new tab. You choose when to send."
              : "Nothing is sent from this form."}
          </p>
        </div>
      </div>
    </dialog>
  );
}
