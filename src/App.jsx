import { useEffect, useRef, useState } from "react";
import { Presentation, ShieldCheck } from "lucide-react";
import { startOriginalScene } from "./originalScene.js";
import { ICON_PATHS } from "./icons.js";
import { siteConfig } from "./siteConfig.js";
import ContactDialog from "./components/ContactDialog.jsx";
import LegalDialog from "./components/LegalDialog.jsx";
import logo from "./assets/logo.png";
import dash from "./assets/H1-home-ta-v2.png";
import menu from "./assets/P1-products.png";
import salesList from "./assets/R1-sales-list.png";
import quickSale from "./assets/S1-main.png";
import sale from "./assets/S7-menu-sale.png";
import hold from "./assets/S11-hold-list.png";
import kitchen from "./assets/M10-kitchen.png";
import staff from "./assets/M7-staff.png";
import gmonth from "./assets/H5-month-detail.png";
import credit from "./assets/C1-credit-list.png";
import reminder from "./assets/C2-reminder.png";
import collect from "./assets/C3-collect.png";
import customers from "./assets/C4-customers.png";
import bill from "./assets/S8-bill.png";
import payment from "./assets/S9-payment.png";
import printPreview from "./assets/S14-print-preview.png";
import productEdit from "./assets/P4-product-edit.png";
import restock from "./assets/P5-restock.png";
import excel from "./assets/M11-excel-tools.png";
import language from "./assets/M3-language.png";
import {
  defaultStoryScreens,
  defaultScreenLabels,
  getStoryDemo,
  storyPanels,
  featureIcons,
  previewReelKeys,
} from "./storyDemos.js";

const gmenu = menu,
  gsale = sale;
const images = {
  logo,
  dash,
  sale,
  menu,
  salesList,
  quickSale,
  hold,
  kitchen,
  staff,
  gmenu,
  gsale,
  gmonth,
  credit,
  reminder,
  collect,
  customers,
  bill,
  payment,
  printPreview,
  productEdit,
  restock,
  excel,
  language,
};

const steps = [
  {
    icon: "box",
    title: "Add your products",
    text: "Enter each item with its price and the stock you have.",
  },
  {
    icon: "calc",
    title: "Record sales and expenses",
    text: "Use the calculator for a quick sale and log every bill as it comes.",
  },
  {
    icon: "trend",
    title: "See profit and who owes you",
    text: "Check reports and the Credit Book whenever you need them.",
  },
];

const features = [
  {
    icon: "book",
    title: "Credit book",
    text: "Know who owes you, and how much. Send a reminder on WhatsApp.",
  },
  {
    icon: "bell",
    title: "Low stock filter",
    text: "Spot items before they run out.",
  },
  {
    icon: "bar",
    title: "Daily, weekly, monthly reports",
    text: "Sales, expenses and profit for any period.",
  },
  {
    icon: "share",
    title: "Print or share",
    text: "Print a bill or report, or send it on WhatsApp.",
  },
  {
    icon: "food",
    title: "Kitchen costing",
    text: "Raw materials, recipe cost and wastage for food businesses.",
  },
  {
    icon: "globe",
    title: "Three languages",
    text: "Use KadaBook in Tamil, English or Sinhala.",
  },
];

function Icon({ name, big = false }) {
  return (
    <i className={`ic${big ? " big" : ""}`} data-ic={name} aria-hidden="true">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={ICON_PATHS[name]} pathLength="1" />
      </svg>
    </i>
  );
}

function Story() {
  const [fallbackSelections, setFallbackSelections] = useState({});
  const [reelIndex, setReelIndex] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return undefined;
    const id = window.setInterval(
      () =>
        setReelIndex((index) => (index + 1) % previewReelKeys.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, []);
  function selectFallback(event) {
    const button = event.target.closest?.("[data-demo-chip]");
    if (
      !button ||
      button.closest(".kadabook-site")?.dataset.sceneState !== "fallback"
    )
      return;
    const index = Number(button.dataset.demoScene);
    const demo = getStoryDemo(index, button.dataset.demoChip, images);
    if (!demo) return;
    setFallbackSelections((previous) => ({
      ...previous,
      [index]: {
        key: demo.available
          ? demo.key
          : previous[index]?.key || defaultStoryScreens[index],
        label: demo.available ? demo.label : previous[index]?.label,
        status: demo.available
          ? `Showing ${demo.showing}`
          : `${demo.label}: screenshot not added`,
      },
    }));
    button
      .closest("section")
      .querySelectorAll("[data-demo-chip]")
      .forEach((control) => {
        if (demo.available)
          control.setAttribute("aria-pressed", String(control === button));
      });
  }
  return (
    <>
      <canvas id="gl" aria-hidden="true" />
      {storyPanels.map((panel, index) => (
        <section
          className={panel.className}
          data-i={index}
          data-icon={panel.icon}
          data-eyebrow={panel.eyebrow}
          data-accent={panel.accent}
          style={{ "--story-accent": panel.accent }}
          key={panel.title}
          onClick={selectFallback}
        >
          <div className="story-kicker">
            <div className="story-icon" aria-hidden="true">
              <Icon name={panel.icon} />
            </div>
            <span>{String(index + 1).padStart(2, "0")} / {String(storyPanels.length).padStart(2, "0")} · {panel.eyebrow}</span>
          </div>
          <h2>{panel.title}</h2>
          <p>{panel.text}</p>
          {panel.chips?.length > 0 && (
            <ul className="feature-rows" aria-label={`${panel.navigationTitle} features and previews`}>
              {panel.chips.map((chip) => (
                <li key={chip}>
                  <button
                    type="button"
                    className="demo-chip"
                    data-demo-chip={chip}
                    data-demo-scene={index}
                    aria-pressed="false"
                  >
                    <Icon name={featureIcons[chip]} />
                    <span>{chip}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {index === 0 && (
            <div className="row">
              <a className="pill" href="#how">
                See how it works
              </a>
              <a className="pill ghost" href="#why">
                Why KadaBook
              </a>
            </div>
          )}
          <div className="fallback-preview">
            {images[
              panel.preview
                ? previewReelKeys[reelIndex]
                : fallbackSelections[index]?.key || defaultStoryScreens[index]
            ] ? (
              <img
                src={
                  images[
                    panel.preview
                      ? previewReelKeys[reelIndex]
                      : fallbackSelections[index]?.key ||
                        defaultStoryScreens[index]
                  ]
                }
                alt={
                  panel.preview
                    ? "KadaBook app preview playing on the phone"
                    : `${fallbackSelections[index]?.label || defaultScreenLabels[index]} app preview`
                }
                loading="lazy"
              />
            ) : (
              <span>Screenshot not supplied</span>
            )}
            <output aria-live="polite">
              {fallbackSelections[index]?.status || ""}
            </output>
          </div>
        </section>
      ))}
      <div className="dots" id="dots">
        {storyPanels.map((panel, index) => (
          <button
            key={panel.title}
            type="button"
            aria-label={`Go to section ${index + 1}`}
            title={panel.navigationTitle}
          />
        ))}
      </div>
      <div className="cue" id="cue" />
      <div id="story" />
    </>
  );
}

const cardAccents = ["#4fd1ff", "#6aa6ff", "#46d8c8"];

function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <h2>Up and running in three steps.</h2>
        <div className="grid steps">
          {steps.map((step, index) => (
            <div
              className="card rv"
              style={{
                "--d": index,
                "--accent": cardAccents[index % cardAccents.length],
              }}
              key={step.title}
            >
              <Icon name={step.icon} big />
              <b>{index + 1}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyKadaBook() {
  return (
    <section id="why" className="why">
      <div className="wrap">
        <h2>Everything a shop needs. Nothing it doesn’t.</h2>
        <p className="lead">
          The notebook, the calculator and the stock register, together in one
          app.
        </p>
        <div className="grid">
          {features.map((feature, index) => (
            <div
              className="card rv"
              style={{
                "--d": index,
                "--accent": cardAccents[index % cardAccents.length],
              }}
              key={feature.title}
            >
              <Icon name={feature.icon} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Screens() {
  return (
    <section id="screens">
      <div className="wrap">
        <h2>A closer look.</h2>
        <p className="lead">
          Point at a screen, or tap it, to bring it forward.
        </p>
        <div className="gal" id="gal">
          <canvas
            id="galc"
            tabIndex={0}
            role="img"
            aria-label="Three KadaBook app screens: menu, new sale and monthly reports. Use left and right arrow keys to select a screen."
          />
          <div className="shots">
            <div className="shot">
              <img
                src={gmenu}
                data-img="gmenu"
                alt="Menu screen"
                loading="lazy"
              />
            </div>
            <div className="shot">
              <img
                src={gsale}
                data-img="gsale"
                alt="New sale screen"
                loading="lazy"
              />
            </div>
            <div className="shot">
              <img
                src={gmonth}
                data-img="gmonth"
                alt="Monthly reports screen"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const rootRef = useRef(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(() => {
    const hash = window.location.hash;
    return hash === "#privacy" || hash === "#terms";
  });
  const [legalTab, setLegalTab] = useState(() =>
    window.location.hash === "#terms" ? "terms" : "privacy",
  );
  const openLegal = (tab) => {
    setLegalTab(tab);
    setLegalOpen(true);
  };
  const number = String(siteConfig.whatsappNumber || "")
    .replace(/\s+/g, "")
    .replace(/^\+/, "");
  const hasNumber = /^\d{7,15}$/.test(number);
  const whatsappUrl = hasNumber ? `https://wa.me/${number}` : "https://wa.me/";
  useEffect(() => startOriginalScene(rootRef.current, images), []);
  const onWhatsApp = (event) => {
    if (!hasNumber) {
      event.preventDefault();
      setContactOpen(true);
    }
  };
  const whatsappProps = {
    href: whatsappUrl,
    onClick: onWhatsApp,
    target: "_blank",
    rel: "noopener noreferrer",
  };

  return (
    <div
      ref={rootRef}
      className="kadabook-site"
      style={{ "--story-scenes": storyPanels.length }}
    >
      <a className="kb-skip" href="#after">
        Skip to content
      </a>
      <header>
        <a className="brand" href="#">
          <img src={logo} data-img="logo" alt="KadaBook logo" />
          KadaBook
        </a>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#why">Why KadaBook</a>
          <a href="#screens">Screens</a>
          <a
            className="pill presentation"
            href="#privacy"
            onClick={(event) => {
              event.preventDefault();
              openLegal("privacy");
            }}
            title="View KadaBook Privacy Policy"
          >
            <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
            <span>Privacy Policy</span>
          </a>
          <a className="pill wa" {...whatsappProps}>
            WhatsApp us
          </a>
        </nav>
      </header>
      <Story />
      <main className="after" id="after">
        <HowItWorks />
        <WhyKadaBook />
        <Screens />
        <section className="final" id="cta">
          <div className="wrap">
            <img
              className="biglogo"
              src={logo}
              data-img="logo"
              alt="KadaBook logo"
            />
            <h2>Run your shop on KadaBook.</h2>
            <p className="lead">
              Digital accounting, simplified for all shops.
            </p>
            <div className="final-actions">
              <a className="pill wa" {...whatsappProps}>
                Get started on WhatsApp
              </a>
              <a
                className="pill presentation"
                href="https://smart-matrixgroup.github.io/kadabook-product-presentation/"
                target="_blank"
                rel="noopener noreferrer"
                title="View KadaBook Presentation"
              >
                <Presentation size={17} strokeWidth={2} aria-hidden="true" />
                <span>Presentation</span>
              </a>
            </div>
          </div>
        </section>
        <footer>
          <div className="fb">
            <img src={logo} data-img="logo" alt="" />
            <div>
              <b>KadaBook</b>
              <span>Digital accounting, simplified for all shops.</span>
            </div>
          </div>
          <div className="fl">
            <a href="#how">How it works</a>
            <a href="#why">Why KadaBook</a>
            <a href="#screens">Screens</a>
            <a
              className="footer-icon-link"
              href="#privacy"
              onClick={(event) => {
                event.preventDefault();
                openLegal("privacy");
              }}
            >
              <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
              <span>Privacy Policy</span>
            </a>
            <a
              className="footer-icon-link"
              href="#terms"
              onClick={(event) => {
                event.preventDefault();
                openLegal("terms");
              }}
            >
              <span>Terms of Use</span>
            </a>
            <a className="wa" {...whatsappProps}>
              WhatsApp
            </a>
          </div>
        </footer>
      </main>
      <ContactDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        whatsappNumber={number}
      />
      <LegalDialog
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
