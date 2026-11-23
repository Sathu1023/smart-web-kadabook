// Screen-space composition shared by the canvas scene and containment tests.
// Model regions include room for camera hardware, sway, and a short reflection.
export function computeStoryLayout({
  width,
  height,
  mobile,
  panelWidth,
  panelHeight,
  index,
  headerBottom = 82,
  lastIndex = 5,
}) {
  const margin = mobile ? 12 : Math.max(24, width * 0.035);
  const top = headerBottom + (mobile ? 12 : 24);
  const bottom = height - (mobile ? 24 : 36);
  const rect = (x, y, w, h) => ({ x, y, width: w, height: Math.max(12, h) });
  const usable = Math.max(1, bottom - top);
  const minPhoneStage = mobile
    ? Math.min(Math.max(148, usable * 0.36), usable * 0.48)
    : 0;
  const contentScale = Math.min(
    1,
    Math.max(0.1, (usable - 16 - minPhoneStage) / panelHeight),
  );
  panelWidth *= contentScale;
  panelHeight *= contentScale;
  let content = rect(
    (width - panelWidth) / 2,
    bottom - panelHeight,
    panelWidth,
    panelHeight,
  );
  let stage;
  let phones;
  let brand = null;
  const landscapeFinal = !mobile && height < 650 && width / height > 1.5;
  if (index === lastIndex) {
    const sw = mobile ? width * 0.94 : Math.min(width * 0.88, 980);
    stage = rect((width - sw) / 2, top, sw, bottom - top);
    if (landscapeFinal) {
      content = rect(
        stage.x + sw - panelWidth - 18,
        top + (stage.height - panelHeight) / 2,
        panelWidth,
        panelHeight,
      );
      phones = rect(
        stage.x + 18,
        top + 20,
        content.x - stage.x - 42,
        stage.height - 40,
      );
    } else {
      phones = rect(stage.x + 18, top + 18, sw - 36, content.y - top - 34);
    }
  } else if (mobile) {
    if (index === 0) {
      const bh = Math.min(58, width * 0.15);
      brand = rect(margin, top, width - margin * 2, bh);
      stage = rect(
        margin,
        top + bh + 8,
        width - margin * 2,
        content.y - top - bh - 24,
      );
    } else {
      stage = rect(margin, top, width - margin * 2, content.y - top - 18);
    }
    phones = rect(
      stage.x + 12,
      stage.y + 12,
      stage.width - 24,
      stage.height - 24,
    );
  } else {
    const rightPhone = index % 2 === 0;
    content.x = rightPhone ? width * 0.06 : width * 0.94 - panelWidth;
    const brandSpace =
      index === 0 && height >= 480
        ? Math.min(150, Math.max(0, bottom - top - panelHeight - 24))
        : 0;
    content.y =
      top + (bottom - top - panelHeight - brandSpace) / 2 + brandSpace;
    const sx = rightPhone
      ? Math.max(width * 0.53, content.x + panelWidth + 32)
      : margin;
    const ex = rightPhone ? width - margin - 12 : content.x - 32;
    const sh = Math.min(bottom - top, height * 0.76);
    stage = rect(sx, top + (bottom - top - sh) / 2, ex - sx, sh);
    phones = rect(
      stage.x + 24,
      stage.y + 30,
      stage.width - 48,
      stage.height - 60,
    );
    if (index === 0)
      brand = rect(
        content.x,
        Math.max(top + 12, content.y - 150),
        panelWidth,
        Math.max(28, Math.min(120, content.y - top - 28)),
      );
  }
  return { content, stage, phones, brand, landscapeFinal, contentScale };
}
