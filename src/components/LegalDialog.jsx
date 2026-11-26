import { useEffect, useId, useRef, useState } from "react";
import { FileText, ShieldCheck, X } from "lucide-react";
import "./legal-dialog.css";

const PRIVACY_SECTIONS = [
  {
    heading: "1. What we collect",
    body: "Account details: your name, phone number or email and shop name. Business data: sales, expenses, stock, credit, staff and branch records you enter. Shop verification (KYC) documents you upload. Device details: app version and basic error reports, used only to fix problems.",
  },
  {
    heading: "2. How we use it",
    body: "To run the app: keep your data in sync across your phones, create reports and receipts, send the WhatsApp reminders you choose to send to your own customers, and help you when you contact us. We do not use your business data for advertising.",
  },
  {
    heading: "3. Where it is stored",
    body: "Your data is stored securely with Google Firebase. KYC documents are kept in a private storage area that only KadaBook admins can open. If you connect Google Drive for backup, backup files are stored in your own Google Drive; KadaBook only accesses files it created (drive.file scope).",
  },
  {
    heading: "4. Sharing",
    body: "We do not sell your data. We share it only with service providers that run the app for us (such as our cloud host), or when the law requires it.",
  },
  {
    heading: "5. Your choices",
    body: "Export your data at any time from More → Data tools. Ask us to delete your account and data from More → Delete my account. Disconnect Google Drive backup anytime in the app; files already in your Drive stay under your control.",
  },
  {
    heading: "6. Security",
    body: "Access to your data needs your login. You can also turn on a PIN lock so only you can open KadaBook on your phone.",
  },
];

const TERMS_SECTIONS = [
  {
    heading: "1. The service",
    body: "KadaBook helps shop owners record sales, expenses, stock, credit and staff activity, and create reports and receipts. Sales can be recorded without internet and upload later; some features need an internet connection.",
  },
  {
    heading: "2. Trial & plans",
    body: "KadaBook starts with a free trial, then paid plans shown under More → Upgrade plan. Payments are made by cash, bank transfer or eZ Cash and confirmed by our team. We never charge you without your agreement.",
  },
  {
    heading: "3. Your data",
    body: "The business data you enter belongs to you. Other shops cannot see it and we do not sell it. You can export it at any time from More → Data tools.",
  },
  {
    heading: "4. Your responsibilities",
    body: "Keep your login and PIN safe, enter correct information, and use KadaBook only for lawful business. You are responsible for the records you keep and the receipts you issue.",
  },
  {
    heading: "5. Account deletion",
    body: "You can ask us to delete your account and all its data at any time from More → Delete my account. We complete it within 7 days.",
  },
  {
    heading: "6. Changes",
    body: "We may update these Terms. If the change is important, we will tell you in the app before it applies.",
  },
];

export default function LegalDialog({ open, onClose, initialTab = "privacy" }) {
  const dialogRef = useRef(null);
  const id = useId();
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

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

  const isPrivacy = tab === "privacy";
  const sections = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <dialog
      ref={dialogRef}
      className="legal-dialog"
      aria-labelledby={`${id}-title`}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="legal-panel">
        <div className="legal-topline">
          <span className="legal-eyebrow">SMART (PVT) LTD · KadaBook</span>
          <button
            className="legal-close"
            type="button"
            aria-label="Close legal dialog"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="legal-tabs" role="tablist" aria-label="Legal documents">
          <button
            type="button"
            role="tab"
            aria-selected={isPrivacy}
            className={`legal-tab${isPrivacy ? " active" : ""}`}
            onClick={() => setTab("privacy")}
          >
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Privacy Policy</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isPrivacy}
            className={`legal-tab${!isPrivacy ? " active" : ""}`}
            onClick={() => setTab("terms")}
          >
            <FileText size={15} aria-hidden="true" />
            <span>Terms of Use</span>
          </button>
        </div>

        <h2 className="legal-title" id={`${id}-title`}>
          {isPrivacy ? "Privacy Policy" : "Terms of Use"}
        </h2>
        <p className="legal-meta">
          Updated 13 November 2026 · Contact:{" "}
          <a href="mailto:matrixgroup.smart@gmail.com">
            matrixgroup.smart@gmail.com
          </a>
        </p>

        <div className="legal-body">
          <p className="legal-intro">
            {isPrivacy
              ? "This Privacy Policy explains what data KadaBook (SMART (PVT) LTD) collects, how it is used and how it is protected."
              : 'These Terms govern your use of KadaBook, a shop accounting and billing app developed and operated by SMART (PVT) LTD ("we", "us"). By creating an account or using the app, you agree to these Terms.'}
          </p>
          {sections.map((section) => (
            <section className="legal-section" key={section.heading}>
              <h3>{section.heading}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
