"use client";

import { useState, useMemo, useEffect } from "react";

export default function StudentDetails({ user, student }: any) {
  const [tab, setTab] = useState("PDF");
  const [editing, setEditing] = useState(false);

  const initialForm = useMemo(
    () => ({
      ...student,
      signeParticulier: student.signeParticulier || "",
      maladieAllergie: student.maladieAllergie || "",
    }),
    [student]
  );

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
const [fees, setFees] = useState<any[]>([]);
const [loadingFees, setLoadingFees] = useState(false);
const [actionId, setActionId] = useState<number | string | null>(null);
const [selectedPaidFee, setSelectedPaidFee] = useState<any | null>(null);
const [selectedPaidFeeIds, setSelectedPaidFeeIds] = useState<Array<number | string>>([]);
const [selectedFeeIdsToPay, setSelectedFeeIdsToPay] = useState<Array<number | string>>([]);
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [paymentForm, setPaymentForm] = useState({
  datePaiement: new Date().toISOString().slice(0, 10),
  tresorerie: "",
  modePaiement: "Espèce",
  reference: "",
  commentaire: "",
});
const [showEditFeesModal, setShowEditFeesModal] = useState(false);
const [editFeesRows, setEditFeesRows] = useState<any[]>([]);

const feeOrder = ["DI", "FG", "UNIF", "SEPT", "OCT", "NOV", "DEC", "JAN", "FEV", "FÉV", "MAR", "AVR", "MAI", "JUIN"];

function getFeeCode(fee: any) {
  return String(fee.code || fee.month || fee.mois || fee.libelle || fee.name || "-")
    .trim()
    .toUpperCase();
}

function getFeeAmount(fee: any) {
  return Number(fee.modifiedMontant ?? fee.montantTotal ?? fee.amount ?? fee.montant ?? fee.tarif ?? fee.value ?? 0);
}

function getFeeLabel(fee: any) {
  return String(fee.libelle || fee.label || fee.name || fee.code || "Frais");
}

function getPaymentKey(fee: any) {
  const code = getFeeCode(fee);
  const trainingFeeId = fee.trainingFeeId || fee.trainingId || fee.sourceTrainingFeeId || fee.id;
  return `${student.id}-${trainingFeeId}-${code}`;
}

function getLocalPayments() {
  if (typeof window === "undefined") return {} as Record<string, any>;

  try {
    return JSON.parse(localStorage.getItem("studentFeePayments") || "{}");
  } catch {
    return {} as Record<string, any>;
  }
}

function saveLocalPayment(key: string, value: any) {
  if (typeof window === "undefined") return;
  const payments = getLocalPayments();
  payments[key] = value;
  localStorage.setItem("studentFeePayments", JSON.stringify(payments));
}

function removeLocalPayment(key: string) {
  if (typeof window === "undefined") return;
  const payments = getLocalPayments();
  delete payments[key];
  localStorage.setItem("studentFeePayments", JSON.stringify(payments));
}

function getLocalFeeEdits() {
  if (typeof window === "undefined") return {} as Record<string, any>;
  try {
    return JSON.parse(localStorage.getItem("studentFeeEdits") || "{}");
  } catch {
    return {} as Record<string, any>;
  }
}

function saveLocalFeeEdit(key: string, value: any) {
  if (typeof window === "undefined") return;
  const edits = getLocalFeeEdits();
  edits[key] = value;
  localStorage.setItem("studentFeeEdits", JSON.stringify(edits));
}

function isFeePaid(fee: any) {
  const status = String(fee.status || fee.statut || "").toUpperCase();
  return Boolean(
    fee.paid === true ||
      fee.isPaid === true ||
      fee.paye === true ||
      status === "PAYE" ||
      status === "PAYÉ" ||
      status === "PAID" ||
      (Number(fee.reste || 0) === 0 && Number(fee.montantPaye || 0) > 0)
  );
}

function sortFees(list: any[]) {
  return [...list].sort((a, b) => {
    const ca = getFeeCode(a);
    const cb = getFeeCode(b);
    const ia = feeOrder.indexOf(ca);
    const ib = feeOrder.indexOf(cb);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return ca.localeCompare(cb);
  });
}

function normalizeTrainingFee(f: any, index: number, paidMap: Map<string, any>, localPayments: Record<string, any>) {
  const code = getFeeCode(f);
  const keyId = f.id ?? `tf-${index}`;
  const linkedPaid = paidMap.get(String(f.id)) || paidMap.get(code);
  const localKey = `${student.id}-${keyId}-${code}`;
  const localPaid = localPayments[localKey];
  const localEdit = getLocalFeeEdits()[localKey];
  const paidInfo = linkedPaid || localPaid;

  return {
    id: paidInfo?.id || `training-${keyId}-${code}`,
    studentFeeId: paidInfo?.id || null,
    trainingFeeId: f.id,
    sourceTrainingFeeId: f.id,
    code: f.code || f.libelle || code,
    libelle: f.libelle || f.code || code,
    montantTotal: Number(localEdit?.montant ?? f.montant ?? f.montantTotal ?? f.amount ?? 0),
    modifiedMontant: localEdit?.montant ? Number(localEdit.montant) : undefined,
    montantPaye: paidInfo ? Number(paidInfo.montantPaye || paidInfo.amount || paidInfo.montantTotal || localEdit?.montant || f.montant || 0) : 0,
    reste: paidInfo ? 0 : Number(localEdit?.montant ?? f.montant ?? f.montantTotal ?? f.amount ?? 0),
    status: paidInfo ? "PAYE" : "NON_PAYE",
    paid: Boolean(paidInfo),
    localOnly: Boolean(localPaid && !linkedPaid),
  };
}

function normalizeStudentFee(f: any, index: number) {
  return {
    ...f,
    id: f.id ?? `student-fee-${index}`,
    studentFeeId: f.id,
    code: f.code || f.libelle || f.month || f.mois || `Frais ${index + 1}`,
    libelle: f.libelle || f.label || f.name || f.code || `Frais ${index + 1}`,
    montantTotal: getFeeAmount(f),
    status: isFeePaid(f) ? "PAYE" : "NON_PAYE",
    paid: isFeePaid(f),
  };
}

useEffect(() => {
  if (tab === "FRAIS DE FORMATION") {
    loadStudentFees();
  }
}, [tab, student?.id]);

async function loadStudentFees() {
  setLoadingFees(true);

  try {
    const currentStudent = {
      ...student,
      ...form,
    };

    const schoolYearName = String(currentStudent.anneeScolaire || "").trim();
    const classeName = String(
      currentStudent.classe ||
        currentStudent.className ||
        currentStudent.classRoomName ||
        ""
    ).trim();

    const classRoomId =
      currentStudent.classRoomId ||
      currentStudent.classId ||
      currentStudent.classeId ||
      "";

    const trainingParams = new URLSearchParams();

    if (currentStudent.id) {
      trainingParams.set("studentId", String(currentStudent.id));
    }

    if (schoolYearName) {
      trainingParams.set("schoolYearName", schoolYearName);
      trainingParams.set("year", schoolYearName);
    }

    if (classeName) {
      trainingParams.set("classe", classeName);
      trainingParams.set("className", classeName);
      trainingParams.set("classRoomName", classeName);
    }

    if (classRoomId) {
      trainingParams.set("classRoomId", String(classRoomId));
      trainingParams.set("classId", String(classRoomId));
    }

    const [studentRes, trainingRes] = await Promise.allSettled([
      fetch(
        `/api/student-fees?studentId=${currentStudent.id}&schoolYearName=${encodeURIComponent(
          schoolYearName
        )}`,
        { cache: "no-store" }
      ),
      fetch(`/api/training-fees?${trainingParams.toString()}`, {
        cache: "no-store",
      }),
    ]);

    let studentData: any[] = [];
    let trainingData: any[] = [];

    if (studentRes.status === "fulfilled" && studentRes.value.ok) {
      const json = await studentRes.value.json();
      studentData = Array.isArray(json) ? json : json.data || [];
    }

    if (trainingRes.status === "fulfilled" && trainingRes.value.ok) {
      const json = await trainingRes.value.json();
      trainingData = Array.isArray(json) ? json : json.data || [];
    }

    // Sécurité côté page: même si l'API renvoie tout, on garde uniquement
    // les frais de l'année scolaire et de la classe actuelle de l'étudiant.
    trainingData = trainingData.filter((fee: any) => {
      const feeYear = String(
        fee.schoolYearName || fee.year || fee.anneeScolaire || ""
      ).trim();

      const feeClasse = String(
        fee.classe || fee.className || fee.classRoomName || ""
      ).trim();

      const feeClassRoomId =
        fee.classRoomId || fee.classId || fee.classeId || "";

      const sameYear = !schoolYearName || !feeYear || feeYear === schoolYearName;

      const sameClassById =
        classRoomId && feeClassRoomId
          ? String(feeClassRoomId) === String(classRoomId)
          : true;

      const sameClassByName =
        classeName && feeClasse
          ? feeClasse.toLowerCase() === classeName.toLowerCase()
          : true;

      return sameYear && sameClassById && sameClassByName;
    });

    const localPayments = getLocalPayments();
    const paidMap = new Map<string, any>();

    studentData.forEach((f: any) => {
      if (!isFeePaid(f)) return;
      if (f.trainingFeeId) paidMap.set(String(f.trainingFeeId), f);
      paidMap.set(getFeeCode(f), f);
    });

    const visibleFees =
      trainingData.length > 0
        ? trainingData.map((f, index) =>
            normalizeTrainingFee(f, index, paidMap, localPayments)
          )
        : studentData.map((f, index) => normalizeStudentFee(f, index));

    setFees(sortFees(visibleFees));
  } catch {
    setFees([]);
  } finally {
    setLoadingFees(false);
  }
}

function formatAmount(value: number | string) {
  return String(value || 0)
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function buildPaymentReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  const random = Math.floor(100 + Math.random() * 900);
  return `PAY-${student.id}-${stamp}-${random}`;
}

function getSelectedFeesToPay() {
  return fees.filter((fee) => selectedFeeIdsToPay.includes(fee.id) && !isFeePaid(fee));
}

function getSelectedPaidFees() {
  return fees.filter((fee) => selectedPaidFeeIds.includes(fee.id) && isFeePaid(fee));
}

function canSelectMultiple(e?: any) {
  if (e?.ctrlKey || e?.metaKey) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function selectPaidFeeForCancel(fee: any, multiple = false) {
  setSelectedFeeIdsToPay([]);
  setSelectedPaidFeeIds((prev) => {
    const next = multiple
      ? prev.includes(fee.id)
        ? prev.filter((id) => id !== fee.id)
        : [...prev, fee.id]
      : prev.length === 1 && prev[0] === fee.id
        ? []
        : [fee.id];

    const selected = fees.filter((item) => next.includes(item.id) && isFeePaid(item));
    setSelectedPaidFee(selected[selected.length - 1] || null);
    return next;
  });
}

function selectFeeForPayment(fee: any, multiple = false) {
  setSelectedPaidFee(null);
  setSelectedPaidFeeIds([]);
  setSelectedFeeIdsToPay((prev) => {
    if (multiple) {
      return prev.includes(fee.id) ? prev.filter((id) => id !== fee.id) : [...prev, fee.id];
    }
    return prev.length === 1 && prev[0] === fee.id ? [] : [fee.id];
  });
}

function openEditFeesModal() {
  const selectedFees = getSelectedFeesToPay();
  if (selectedFees.length === 0) return;
  setEditFeesRows(
    selectedFees.map((fee) => ({
      id: fee.id,
      key: getPaymentKey(fee),
      code: getFeeCode(fee),
      libelle: getFeeLabel(fee),
      montant: String(getFeeAmount(fee)),
    }))
  );
  setShowEditFeesModal(true);
}

function saveEditedFees() {
  const cleanedRows = editFeesRows.map((row) => ({
    ...row,
    montant: Number(String(row.montant).replace(/\D/g, "") || 0),
  }));

  for (const row of cleanedRows) {
    saveLocalFeeEdit(row.key, { montant: row.montant, updatedAt: new Date().toISOString() });
  }

  setFees((prev) =>
    prev.map((fee) => {
      const row = cleanedRows.find((r) => r.id === fee.id || r.key === getPaymentKey(fee));
      if (!row) return fee;
      return {
        ...fee,
        montantTotal: row.montant,
        modifiedMontant: row.montant,
        reste: isFeePaid(fee) ? 0 : row.montant,
      };
    })
  );

  setShowEditFeesModal(false);
}

function openPaymentModal() {
  const selectedFees = getSelectedFeesToPay();
  if (selectedFees.length === 0) return;
  setPaymentForm({
    datePaiement: new Date().toISOString().slice(0, 10),
    tresorerie: "",
    modePaiement: "Espèce",
    reference: buildPaymentReference(),
    commentaire: "",
  });
  setShowPaymentModal(true);
}

function closePaymentModal() {
  setShowPaymentModal(false);
}

async function payOneFee(fee: any) {
  if (isFeePaid(fee)) {
    setSelectedPaidFee(fee);
    return;
  }

  setActionId(fee.id);

  const paymentReference = paymentForm.reference || buildPaymentReference();

  const paidFee = {
    ...fee,
    status: "PAYE",
    paid: true,
    montantPaye: getFeeAmount(fee),
    montantTotal: getFeeAmount(fee),
    reste: 0,
    paidAt: paymentForm.datePaiement || new Date().toISOString(),
    tresorerie: paymentForm.tresorerie,
    modePaiement: paymentForm.modePaiement,
    reference: paymentReference,
    commentaire: paymentForm.commentaire,
  };

  try {
    let saved = false;

    if (fee.studentFeeId && !String(fee.studentFeeId).startsWith("training-")) {
      const res = await fetch("/api/student-fees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fee.studentFeeId,
          action: "PAY",
          montantPaye: getFeeAmount(fee),
        }),
      });
      saved = res.ok;
    } else {
      const res = await fetch("/api/student-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          trainingFeeId: fee.trainingFeeId || fee.sourceTrainingFeeId,
          code: getFeeCode(fee),
          libelle: getFeeLabel(fee),
          montantTotal: getFeeAmount(fee),
          montantPaye: getFeeAmount(fee),
          reste: 0,
          status: "PAYE",
          datePaiement: paymentForm.datePaiement,
          tresorerie: paymentForm.tresorerie,
          modePaiement: paymentForm.modePaiement,
          reference: paymentReference,
          commentaire: paymentForm.commentaire,
        }),
      });
      saved = res.ok;
    }

    // Fallback local: mampandeha paiement/impression na dia mbola tsy vonona aza ny API POST/PATCH.
    if (!saved) {
      saveLocalPayment(getPaymentKey(fee), paidFee);
    }

    setFees((prev) =>
      prev.map((item) =>
        item.id === fee.id || getPaymentKey(item) === getPaymentKey(fee) ? paidFee : item
      )
    );
    setSelectedPaidFee(paidFee);

    if (saved) await loadStudentFees();
  } catch {
    saveLocalPayment(getPaymentKey(fee), paidFee);
    setFees((prev) => prev.map((item) => (item.id === fee.id ? paidFee : item)));
    setSelectedPaidFee(paidFee);
  } finally {
    setActionId(null);
  }
}

async function paySelectedFees() {
  const selectedFees = getSelectedFeesToPay();
  if (selectedFees.length === 0) return;

  if (!paymentForm.tresorerie) {
    alert("Veuillez sélectionner une trésorerie avant de valider le paiement.");
    return;
  }

  const paymentReference = paymentForm.reference || buildPaymentReference();
  if (!paymentForm.reference) {
    setPaymentForm((p) => ({ ...p, reference: paymentReference }));
  }

  for (const fee of selectedFees) {
    await payOneFee(fee);
  }

  const paidFees = selectedFees.map((fee) => ({
    ...fee,
    status: "PAYE",
    paid: true,
    montantPaye: getFeeAmount(fee),
    montantTotal: getFeeAmount(fee),
    reste: 0,
    paidAt: paymentForm.datePaiement || new Date().toISOString(),
    tresorerie: paymentForm.tresorerie,
    modePaiement: paymentForm.modePaiement,
    reference: paymentReference,
    commentaire: paymentForm.commentaire,
  }));

  setSelectedPaidFee(paidFees[paidFees.length - 1] || null);
  setSelectedPaidFeeIds(paidFees.map((fee) => fee.id));
  setSelectedFeeIdsToPay([]);
  setShowPaymentModal(false);
  printTicketMultiple(paidFees);
}

async function cancelOnePayment(fee: any) {
  let cancelled = false;

  if (fee.studentFeeId && !fee.localOnly && !String(fee.studentFeeId).startsWith("training-")) {
    const res = await fetch("/api/student-fees", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: fee.studentFeeId,
        action: "CANCEL",
      }),
    });
    cancelled = res.ok;
  }

  removeLocalPayment(getPaymentKey(fee));

  const unpaidFee = {
    ...fee,
    status: "NON_PAYE",
    paid: false,
    montantPaye: 0,
    reste: getFeeAmount(fee),
    localOnly: false,
  };

  setFees((prev) =>
    prev.map((item) =>
      item.id === fee.id || getPaymentKey(item) === getPaymentKey(fee)
        ? unpaidFee
        : item
    )
  );

  return cancelled;
}

async function cancelPayment() {
  const selectedPayments = getSelectedPaidFees();
  const paymentsToCancel = selectedPayments.length > 0 ? selectedPayments : selectedPaidFee ? [selectedPaidFee] : [];
  if (paymentsToCancel.length === 0) return;

  if (!confirm(paymentsToCancel.length > 1 ? `Annuler ces ${paymentsToCancel.length} paiements ?` : "Annuler ce paiement ?")) return;

  setActionId("cancel-multiple");

  try {
    let shouldReload = false;

    for (const fee of paymentsToCancel) {
      const cancelled = await cancelOnePayment(fee);
      shouldReload = shouldReload || cancelled;
    }

    setSelectedPaidFee(null);
    setSelectedPaidFeeIds([]);

    if (shouldReload) await loadStudentFees();
  } finally {
    setActionId(null);
  }
}

function printTicket(fee: any) {
  const win = window.open("", "_blank", "width=320,height=650");
  if (!win) return;

  const studentName = `${student.nom || ""} ${student.prenoms || ""}`.trim();
  const classe = student.classe || student.className || student.classRoomName || "-";
  const matricule = student.matricule || student.registrationNumber || "-";
  const now = new Date().toLocaleString("fr-FR");

  win.document.write(`
    <html>
      <head>
        <title>Reçu ${getFeeCode(fee)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            width: 58mm;
            font-family: Arial, monospace;
            font-size: 11px;
            padding: 6px;
            color: #000;
            margin: 0;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .school { font-size: 14px; font-weight: 900; }
          .small { font-size: 10px; }
          .line { border-top: 1px dashed #000; margin: 7px 0; }
          .row { display: flex; justify-content: space-between; gap: 7px; }
          .total { font-size: 13px; font-weight: 900; }
          @media print {
            @page { size: 58mm auto; margin: 0; }
            body { margin: 0; width: 58mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="center school">STRELITZIA SCHOOL</div>
        <div class="center bold">REÇU FRAIS DE FORMATION</div>
        <div class="center small">${now}</div>
        <div class="line"></div>

        <div>Élève : <span class="bold">${studentName || "-"}</span></div>
        <div>Matricule : <span class="bold">${matricule}</span></div>
        <div>Classe : <span class="bold">${classe}</span></div>

        <div class="line"></div>

        <div class="row"><span>Frais</span><span class="bold">${getFeeCode(fee)}</span></div>
        <div class="bold">${getFeeLabel(fee)}</div>
        <div class="row total"><span>Montant payé</span><span>${formatAmount(getFeeAmount(fee))} Ar</span></div>
        <div class="row"><span>Reste</span><span>0 Ar</span></div>
        <div class="row"><span>Statut</span><span class="bold">PAYÉ</span></div>
        <div class="row"><span>Mode</span><span>${fee.modePaiement || "-"}</span></div>
        <div class="row"><span>Référence</span><span>${fee.reference || "-"}</span></div>

        <div class="line"></div>
        <div class="center small">Merci pour votre paiement</div>
        <br/>
        <div class="center small">Signature / Cachet</div>
        <br/><br/>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  win.document.close();
}

function printTicketMultiple(selectedFees: any[]) {
  if (!selectedFees.length) return;

  const win = window.open("", "_blank", "width=320,height=650");
  if (!win) return;

  const studentName = `${student.nom || ""} ${student.prenoms || ""}`.trim();
  const classe = student.classe || student.className || student.classRoomName || "-";
  const matricule = student.matricule || student.registrationNumber || "-";
  const now = new Date().toLocaleString("fr-FR");
  const total = selectedFees.reduce((sum, fee) => sum + getFeeAmount(fee), 0);
  const rows = selectedFees
    .map(
      (fee) => `
        <div class="row"><span>${getFeeCode(fee)}</span><span>${formatAmount(getFeeAmount(fee))} Ar</span></div>
        <div class="small bold">${getFeeLabel(fee)}</div>
      `
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Reçu frais formation</title>
        <style>
          * { box-sizing: border-box; }
          body { width: 58mm; font-family: Arial, monospace; font-size: 11px; padding: 6px; color: #000; margin: 0; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .school { font-size: 14px; font-weight: 900; }
          .small { font-size: 10px; }
          .line { border-top: 1px dashed #000; margin: 7px 0; }
          .row { display: flex; justify-content: space-between; gap: 7px; }
          .total { font-size: 13px; font-weight: 900; }
          @media print { @page { size: 58mm auto; margin: 0; } body { margin: 0; width: 58mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="center school">STRELITZIA SCHOOL</div>
        <div class="center bold">REÇU FRAIS DE FORMATION</div>
        <div class="center small">${now}</div>
        <div class="line"></div>
        <div>Élève : <span class="bold">${studentName || "-"}</span></div>
        <div>Matricule : <span class="bold">${matricule}</span></div>
        <div>Classe : <span class="bold">${classe}</span></div>
        <div class="line"></div>
        ${rows}
        <div class="line"></div>
        <div class="row total"><span>Total payé</span><span>${formatAmount(total)} Ar</span></div>
        <div class="row"><span>Mode</span><span>${paymentForm.modePaiement || "-"}</span></div>
        <div class="row"><span>Référence</span><span>${paymentForm.reference || "-"}</span></div>
        <div class="line"></div>
        <div class="center small">Merci pour votre paiement</div>
        <br/><div class="center small">Signature / Cachet</div><br/><br/>
        <script>window.onload = function() { window.focus(); window.print(); };</script>
      </body>
    </html>
  `);

  win.document.close();
}
  const [academics, setAcademics] = useState<any[]>([]);

  useEffect(() => {
    async function loadAcademics() {
      try {
        const year = form.anneeScolaire || "2025-2026";
        const res = await fetch(`/api/academics?year=${encodeURIComponent(year)}`);
        const data = await res.json();

        setAcademics(Array.isArray(data) ? data : data.levels || []);
      } catch {
        setAcademics([]);
      }
    }

    loadAcademics();
  }, [form.anneeScolaire]);

  const classOptions = useMemo(() => {
    const classes = academics.flatMap((level: any) => level.classes || []);
    return Array.from(new Set(classes.map((c: any) => c.name).filter(Boolean)));
  }, [academics]);

  const serieOptions = useMemo(() => {
    const classes = academics.flatMap((level: any) => level.classes || []);
    const selectedClass = classes.find((c: any) => c.name === form.classe);

    return Array.from(
      new Set((selectedClass?.series || []).map((s: any) => s.name).filter(Boolean))
    );
  }, [academics, form.classe]);

  const tabs = [
    "PDF",
    "ETUDIANT",
    "PARENTS",
    "TUTEURS",
    "FRAIS DE FORMATION",
    "ACTIVITÉS",
    "R-A-S",
    "LES EXAMENS",
    "CERTIFICAT",
  ];

  function update(name: string, value: string) {
    setForm((prev: any) => {
      if (name === "classe") {
        return {
          ...prev,
          classe: value,
          section: "",
        };
      }

      return { ...prev, [name]: value };
    });
  }

  async function saveStudent() {
    try {
      setSaving(true);

      const payload = {
        photoUrl: form.photoUrl || "",
        matricule: form.matricule || "",
        site: form.site || "Strelitzia School",
        anneeScolaire: form.anneeScolaire || "2025-2026",
        dateInscription: form.dateInscription,

        nom: form.nom || "",
        prenoms: form.prenoms || "",
        sexe: form.sexe === "Feminin" ? "Feminin" : "Masculin",
        classe: form.classe || "",
        section: form.section || "",

        contact: form.contact || "",
        dateNaissance: form.dateNaissance || null,
        lieuNaissance: form.lieuNaissance || "",
        adresse: form.adresse || "",
        signeParticulier: form.signeParticulier || "",
        maladieAllergie: form.maladieAllergie || "",
        email: form.email || "",

        pereNom: form.pereNom || "",
        pereTel: form.pereTel || "",
        mereNom: form.mereNom || "",
        mereTel: form.mereTel || "",
        parentAdresse: form.parentAdresse || "",

        tuteurNom: form.tuteurNom || "",
        tuteurLien: form.tuteurLien || "",
        tuteurTel: form.tuteurTel || "",
        tuteurAdresse: form.tuteurAdresse || "",

        niveau: form.niveau || "",
        fraisInscription: form.fraisInscription || "",
        fraisScolarite: form.fraisScolarite || "",

        activite: form.activite || "",
        remarque: form.remarque || "",
      };

      const res = await fetch(`/api/students/${form.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur modification étudiant");
        return;
      }

      setForm(data);
      setEditing(false);
      alert("Modification enregistrée avec succès !");
    } catch {
      alert("Erreur serveur");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent() {
    const ok = confirm(
      "Voulez-vous vraiment supprimer cet étudiant ?\n\nToutes ses informations seront supprimées définitivement."
    );

    if (!ok) return;

    const res = await fetch(`/api/students/${form.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Erreur suppression étudiant");
      return;
    }

    alert("Étudiant supprimé avec succès.");
    window.location.href = "/user";
  }

  function printPdfOnly() {
    window.print();
  }

  return (
    <main className="fixed inset-0 flex bg-[#eef2f7] overflow-hidden text-slate-900">
      <style>{`
        @media screen and (max-width: 768px) {
          .student-main-content {
            padding: 10px !important;
            background: #eef2f7 !important;
          }

          .student-pdf-wrapper {
            width: 100% !important;
            margin: 0 !important;
          }

          #pdf-print-area {
            width: 100% !important;
            overflow: visible !important;
          }

          .pdf-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            padding: 18px !important;
            font-size: 12px !important;
            box-shadow: none !important;
            border-radius: 14px !important;
            overflow-wrap: anywhere !important;
          }

          .pdf-page h1 {
            font-size: 17px !important;
            margin-bottom: 20px !important;
          }

          .pdf-page h2 {
            font-size: 15px !important;
          }

          .pdf-photo {
            width: 86px !important;
            height: 102px !important;
          }

          .pdf-section {
            margin-bottom: 22px !important;
          }

          .pdf-line {
            display: grid !important;
            grid-template-columns: 118px minmax(0, 1fr) !important;
            gap: 6px !important;
            align-items: end !important;
            min-height: 24px !important;
          }

          .pdf-line-label {
            min-width: 0 !important;
            font-size: 11px !important;
          }

          .pdf-mobile-toolbar {
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            width: 100% !important;
            justify-content: space-between !important;
            gap: 10px !important;
            padding: 8px 0 !important;
            margin-bottom: 10px !important;
            background: #eef2f7 !important;
          }

          .pdf-mobile-toolbar button {
            flex: 1 !important;
            width: auto !important;
            height: 44px !important;
            border-radius: 14px !important;
            font-size: 18px !important;
          }

          .pdf-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) 78px !important;
            gap: 12px !important;
            align-items: start !important;
            margin-bottom: 18px !important;
          }

          .pdf-page {
            border: 1px solid #e2e8f0 !important;
          }

          .training-fee-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }

          .training-fee-card {
            min-height: 116px !important;
            border-radius: 16px !important;
            padding: 12px !important;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08) !important;
            touch-action: manipulation !important;
          }

          .training-fee-actions {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 30 !important;
            margin: 14px -12px -12px !important;
            padding: 12px !important;
            background: rgba(255,255,255,0.96) !important;
            border-top: 1px solid #e2e8f0 !important;
          }

          .training-fee-actions button {
            flex: 1 1 145px !important;
            min-height: 46px !important;
            border-radius: 14px !important;
            font-weight: 800 !important;
          }

          .mobile-modal-panel {
            max-height: calc(100dvh - 24px) !important;
            border-radius: 18px !important;
          }

          .mobile-modal-body {
            padding: 14px !important;
          }

          .mobile-modal-actions {
            position: sticky !important;
            bottom: -14px !important;
            margin-left: -14px !important;
            margin-right: -14px !important;
            padding: 12px 14px !important;
          }

          .mobile-modal-actions button {
            flex: 1 !important;
            min-height: 45px !important;
            border-radius: 14px !important;
            font-weight: 800 !important;
          }

          .pdf-line-value {
            min-width: 0 !important;
            word-break: break-word !important;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          body * {
            visibility: hidden !important;
          }

          #pdf-print-area,
          #pdf-print-area * {
            visibility: visible !important;
          }

          #pdf-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .pdf-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 190mm !important;
            min-height: 277mm !important;
          }
        }
      `}</style>

      <aside className="hidden lg:flex w-[220px] bg-[#4a4a4a] text-white flex-col no-print">
        <div className="h-[70px] bg-white flex items-center px-3">
          <div>
            <div className="text-[22px] font-black text-red-600 leading-none">
              STRELITZIA
            </div>
            <div className="text-[14px] font-black text-green-600">
              SCHOOL
            </div>
          </div>
        </div>

        <div className="bg-[#303030] px-3 py-3">
          <p className="font-bold">{user.name}</p>
          <p className="text-[11px]">{user.role}</p>
        </div>

        <button
          onClick={() => (window.location.href = "/user")}
          className="w-full text-left px-4 py-3 hover:bg-[#b7b7b7]"
        >
          ← Retour liste étudiants
        </button>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[58px] shrink-0 bg-white border-b px-4 flex items-center justify-between no-print">
          <h1 className="text-[18px] font-bold">
            Fiche étudiant › {form.nom} {form.prenoms}
          </h1>

          <button
            onClick={() => (window.location.href = "/user")}
            className="border px-3 py-2 rounded-md hover:bg-slate-50"
          >
            Liste des étudiants
          </button>
        </header>

        <div className="shrink-0 bg-white border-b px-4 py-3 flex gap-4 overflow-x-auto no-print">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-3 py-2 rounded-md font-semibold text-sm ${
                tab === t
                  ? "bg-slate-800 text-white"
                  : "text-blue-600 hover:bg-blue-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="student-main-content flex-1 overflow-auto bg-[#d9dde3] p-6">
          {tab === "PDF" && (
            <PdfPage student={form} printPdfOnly={printPdfOnly} />
          )}

          {tab === "ETUDIANT" && (
            <ProCard
              title="Informations de l’étudiant"
              subtitle="Identité, photo et coordonnées"
            >
              <div className="mb-8 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6 items-start">
                <div className="rounded-2xl border bg-slate-50 p-4 flex justify-center">
                  {form.photoUrl ? (
                    <img
                      src={form.photoUrl}
                      alt={form.nom}
                      className="w-[140px] h-[165px] object-cover rounded-xl border shadow-sm"
                    />
                  ) : (
                    <div className="w-[140px] h-[165px] bg-slate-200 border rounded-xl flex items-center justify-center text-[55px]">
                      👤
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-slate-500">
                      Photo étudiant
                    </span>

                    {editing ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const formData = new FormData();
                          formData.append("photo", file);

                          const res = await fetch("/api/upload/student-photo", {
                            method: "POST",
                            body: formData,
                          });

                          const data = await res.json();

                          if (!res.ok) {
                            alert(data.error || "Erreur upload photo");
                            return;
                          }

                          update("photoUrl", data.url);
                          alert("Photo chargée. Clique Enregistrer pour sauvegarder.");
                        }}
                        className="mt-2 w-full border border-slate-200 bg-white rounded-xl px-4 py-3"
                      />
                    ) : (
                      <p className="mt-2 text-slate-700">
                        {form.photoUrl ? "Photo enregistrée" : "Aucune photo"}
                      </p>
                    )}
                  </label>

                  <p className="text-xs text-slate-500 mt-2">
                    La photo est enregistrée dans la base de données et apparaît automatiquement dans le PDF.
                  </p>
                </div>
              </div>

              <Grid>
                <Field label="Matricule" name="matricule" value={form.matricule} editing={editing} onChange={update} />
                <Field label="Nom" name="nom" value={form.nom} editing={editing} onChange={update} />
                <Field label="Prénoms" name="prenoms" value={form.prenoms} editing={editing} onChange={update} />
                <SelectField label="Sexe" name="sexe" value={form.sexe} editing={editing} onChange={update} options={["Masculin", "Feminin"]} />

                <SelectField label="Classe" name="classe" value={form.classe} editing={editing} onChange={update} options={classOptions} />
                <SelectField label="Série" name="section" value={form.section} editing={editing} onChange={update} options={serieOptions} />

                <Field label="Date naissance" name="dateNaissance" value={toInputDate(form.dateNaissance)} editing={editing} onChange={update} type="date" />
                <Field label="Lieu naissance" name="lieuNaissance" value={form.lieuNaissance} editing={editing} onChange={update} />
                <Field label="Téléphone" name="contact" value={form.contact} editing={editing} onChange={update} />
                <Field label="Adresse" name="adresse" value={form.adresse} editing={editing} onChange={update} />
                <Field label="Signe particulier" name="signeParticulier" value={form.signeParticulier} editing={editing} onChange={update} />
                <Field label="Maladie ou allergique" name="maladieAllergie" value={form.maladieAllergie} editing={editing} onChange={update} />
                <Field label="Email" name="email" value={form.email} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} deleteStudent={deleteStudent} showDelete />
            </ProCard>
          )}

          {tab === "PARENTS" && (
            <ProCard title="Informations des parents" subtitle="Coordonnées et informations familiales">
              <Grid>
                <Field label="Nom du père" name="pereNom" value={form.pereNom} editing={editing} onChange={update} />
                <Field label="Téléphone père" name="pereTel" value={form.pereTel} editing={editing} onChange={update} />
                <Field label="Nom de la mère" name="mereNom" value={form.mereNom} editing={editing} onChange={update} />
                <Field label="Téléphone mère" name="mereTel" value={form.mereTel} editing={editing} onChange={update} />
                <Field label="Adresse parents" name="parentAdresse" value={form.parentAdresse} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "TUTEURS" && (
            <ProCard title="Informations du tuteur" subtitle="Personne responsable ou contact secondaire">
              <Grid>
                <Field label="Nom tuteur" name="tuteurNom" value={form.tuteurNom} editing={editing} onChange={update} />
                <Field label="Lien avec l’étudiant" name="tuteurLien" value={form.tuteurLien} editing={editing} onChange={update} />
                <Field label="Téléphone tuteur" name="tuteurTel" value={form.tuteurTel} editing={editing} onChange={update} />
                <Field label="Adresse tuteur" name="tuteurAdresse" value={form.tuteurAdresse} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "FRAIS DE FORMATION" && (
  <div className="rounded border border-slate-300 bg-white p-3">
    {loadingFees ? (
      <div className="p-10 text-center text-slate-500">Chargement...</div>
    ) : fees.length === 0 ? (
      <div className="p-10 text-center text-slate-500">
        Aucun détail de frais trouvé dans /api/training-fees.
      </div>
    ) : (
      <>
        <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">
          Mobile : touche plusieurs frais pour les sélectionner ensemble. PC : CTRL + click pour sélection multiple.
        </div>
        <div className="training-fee-grid grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {fees.map((fee) => {
            const paid = isFeePaid(fee);
            const selectedPaid = selectedPaidFeeIds.includes(fee.id);
            const selectedToPay = selectedFeeIdsToPay.includes(fee.id);

            return (
              <div
               key={`${fee.id}-${fee.trainingFeeId || fee.sourceTrainingFeeId || ""}-${getFeeCode(fee)}`}
                onClick={(e) => {
                  if (paid) {
                    selectPaidFeeForCancel(fee, canSelectMultiple(e));
                  } else {
                    selectFeeForPayment(fee, canSelectMultiple(e));
                  }
                }}
                className={`training-fee-card min-h-[103px] cursor-pointer rounded-[2px] border p-3 text-center transition ${
                  paid
                    ? selectedPaid
                      ? "border-slate-400 bg-[#dfe3e6] text-black"
                      : "border-[#2f343c] bg-[#2f343c] text-white"
                    : selectedToPay
                      ? "border-slate-300 bg-[#dfe3e6] text-black"
                      : "border-yellow-200 bg-[#fffec0] text-black"
                }`}
              >
                <div className="mb-2 truncate text-[12px] font-bold uppercase">
                  {getFeeCode(fee)}
                </div>

                <div className="mb-3 text-[12px]">
                  ( {formatAmount(getFeeAmount(fee))} Ar )
                </div>

                {paid ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      printTicket(fee);
                    }}
                    className="w-full bg-[#737d86] px-2 py-[6px] text-[11px] font-bold text-white hover:bg-[#66707a]"
                  >
                    🖨 Imprimer ticket
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectFeeForPayment(fee, canSelectMultiple(e));
                    }}
                    className="w-full bg-[#22ad3e] px-2 py-[6px] text-[11px] font-bold text-white hover:bg-[#188b31]"
                  >
                    Faire un règlement
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedFeeIdsToPay.length > 0 && !selectedPaidFee && (
          <div className="training-fee-actions mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openPaymentModal}
              className="min-w-[115px] rounded-[2px] border border-slate-700 bg-white px-5 py-2 text-[12px] font-medium text-slate-800 hover:bg-slate-100"
            >
              PAYÉE {selectedFeeIdsToPay.length > 1 ? `(${selectedFeeIdsToPay.length})` : ""}
            </button>

            <button
              type="button"
              onClick={openEditFeesModal}
              className="min-w-[115px] rounded-[2px] border border-yellow-500 bg-yellow-400 px-5 py-2 text-[12px] font-medium text-slate-900 hover:bg-yellow-300"
            >
              ✎ MODIF FRAIS
            </button>
          </div>
        )}

        {selectedPaidFeeIds.length > 0 && (
          <div className="training-fee-actions mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const selectedPayments = getSelectedPaidFees();
                selectedPayments.length > 1 ? printTicketMultiple(selectedPayments) : printTicket(selectedPayments[0] || selectedPaidFee);
              }}
              className="min-w-[115px] rounded-[2px] border border-slate-700 bg-white px-5 py-2 text-[12px] text-slate-800 hover:bg-slate-100"
            >
              🖨 IMPRIMER
            </button>

            <button
              type="button"
              disabled={actionId === "cancel-multiple"}
              onClick={cancelPayment}
              className="min-w-[115px] rounded-[2px] border border-red-500 bg-white px-5 py-2 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              ↺ ANNULER {selectedPaidFeeIds.length > 1 ? `(${selectedPaidFeeIds.length})` : ""}
            </button>
          </div>
        )}

        {showEditFeesModal && (
          <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:py-10">
            <div className="mobile-modal-panel flex max-h-[calc(100vh-48px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[3px] bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#2f343c] px-4 py-3 text-white">
                <h3 className="text-[16px] font-bold">Modification des frais</h3>
                <button type="button" onClick={() => setShowEditFeesModal(false)} className="text-lg leading-none text-white/80 hover:text-white">×</button>
              </div>

              <div className="mobile-modal-body min-h-0 overflow-y-auto p-4 text-[12px]">
                <div className="max-h-[360px] overflow-y-auto border border-slate-300">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="sticky top-0 z-10 bg-[#2f343c] text-white">
                        <th className="border-r border-slate-500 px-2 py-2 text-left">Nom du frais</th>
                        <th className="w-[190px] px-2 py-2 text-right">Nouveau montant (Ar)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editFeesRows.map((row, index) => (
                        <tr key={`${row.id}-${row.code}-${index}`} className="bg-slate-50">
                          <td className="border-r border-slate-300 px-2 py-2">{row.libelle}</td>
                          <td className="px-2 py-2">
                            <input
                              value={formatAmount(row.montant)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "");
                                setEditFeesRows((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, montant: raw } : item))
                                );
                              }}
                              className="w-full border border-slate-300 px-2 py-1 text-right outline-none focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-modal-actions sticky bottom-0 mt-4 flex justify-end gap-2 border-t bg-white pt-3">
                  <button
                    type="button"
                    onClick={() => setShowEditFeesModal(false)}
                    className="rounded-[2px] bg-slate-500 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={saveEditedFees}
                    className="rounded-[2px] bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPaymentModal && selectedFeeIdsToPay.length > 0 && (
          <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:py-10">
            <div className="mobile-modal-panel flex max-h-[calc(100vh-48px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[3px] bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-[#2f343c] px-4 py-3 text-white">
                <h3 className="text-[16px] font-bold">Payment des frais</h3>
                <button type="button" onClick={closePaymentModal} className="text-lg leading-none text-white/80 hover:text-white">×</button>
              </div>

              <div className="mobile-modal-body min-h-0 overflow-y-auto p-4 text-[12px]">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-slate-600">Date du paiement</span>
                    <input
                      type="date"
                      value={paymentForm.datePaiement}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, datePaiement: e.target.value }))}
                      className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-slate-600">Trésorerie</span>
                    <select
                      value={paymentForm.tresorerie}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, tresorerie: e.target.value }))}
                      className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      <option value="">Choisissez la trésorerie</option>
                      <option value="Caisse principale">Caisse principale</option>
                      <option value="Caisse école">Caisse école</option>
                      <option value="Banque">Banque</option>
                      <option value="Mobile money">Mobile money</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-slate-600">Mode paiement</span>
                    <select
                      value={paymentForm.modePaiement}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, modePaiement: e.target.value }))}
                      className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      <option value="Espèce">Espèce</option>
                      <option value="Chèque">Chèque</option>
                      <option value="Mvola">Mvola</option>
                      <option value="Orange monnaie">Orange monnaie</option>
                      <option value="Virement">Virement</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-slate-600">Commentaire</span>
                    <input
                      value={paymentForm.commentaire}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, commentaire: e.target.value }))}
                      className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1 block text-slate-600">Référence automatique</span>
                  <input
                    value={paymentForm.reference}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-300 px-3 py-2 font-bold text-slate-700 outline-none"
                  />
                  <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                    Elle change automatiquement à chaque nouveau paiement.
                  </span>
                </label>

                <div className="mt-4 max-h-[260px] overflow-y-auto border border-slate-300">
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="sticky top-0 z-10 bg-[#2f343c] text-white">
                        <th className="border-r border-slate-500 px-2 py-2 text-left">Nom du frais</th>
                        <th className="w-[170px] px-2 py-2 text-right">Montant (Ar)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSelectedFeesToPay().map((fee) => (
                        <tr key={`${fee.id}-${fee.trainingFeeId || fee.sourceTrainingFeeId || ""}-${getFeeCode(fee)}`} className="bg-slate-50">
                          <td className="border-r border-slate-300 px-2 py-2">{getFeeLabel(fee)}</td>
                          <td className="px-2 py-2 text-right">{formatAmount(getFeeAmount(fee))}</td>
                        </tr>
                      ))}
                      <tr className="sticky bottom-0 bg-white font-bold shadow-[0_-1px_0_#cbd5e1]">
                        <td className="border-r border-slate-300 px-2 py-3">MONTANT TOTAL PAYÉE</td>
                        <td className="px-2 py-3 text-right text-blue-600">
                          {formatAmount(getSelectedFeesToPay().reduce((sum, fee) => sum + getFeeAmount(fee), 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mobile-modal-actions sticky bottom-0 mt-4 flex justify-end gap-2 border-t bg-white pt-3">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="rounded-[2px] bg-slate-500 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    disabled={actionId !== null || !paymentForm.tresorerie}
                    onClick={paySelectedFees}
                    className="rounded-[2px] bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionId !== null ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
)}

          {tab === "ACTIVITÉS" && (
            <ProCard title="Activités" subtitle="Activités scolaires">
              <Grid>
                <Field label="Activité" name="activite" value={form.activite} editing={editing} onChange={update} />
              </Grid>

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "R-A-S" && (
            <ProCard title="R-A-S" subtitle="Remarques et observations">
              <TextAreaField label="Remarque" name="remarque" value={form.remarque} editing={editing} onChange={update} />

              <BottomActions editing={editing} setEditing={setEditing} saveStudent={saveStudent} saving={saving} />
            </ProCard>
          )}

          {tab === "LES EXAMENS" && (
            <ProCard title="Les examens" subtitle="Résultats et suivi">
              <p className="text-slate-500">Aucun examen enregistré.</p>
            </ProCard>
          )}

          {tab === "CERTIFICAT" && (
            <ProCard title="Certificat" subtitle="Documents administratifs">
              <p className="text-slate-500">Aucun certificat disponible.</p>
            </ProCard>
          )}
        </div>
      </section>
    </main>
  );
}

function BottomActions({ editing, setEditing, saveStudent, saving, deleteStudent, showDelete = false }: any) {
  return (
    <div className="mt-10 pt-6 border-t flex flex-wrap justify-end gap-3">
      {!editing ? (
        <button onClick={() => setEditing(true)} className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-xl font-bold shadow-sm">
          Modifier
        </button>
      ) : (
        <>
          <button onClick={() => setEditing(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold">
            Annuler
          </button>

          <button onClick={saveStudent} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-bold shadow-sm">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </>
      )}

      {showDelete && (
        <button onClick={deleteStudent} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold shadow-sm">
          Supprimer l’étudiant
        </button>
      )}
    </div>
  );
}

function Field({ label, name, value, editing, onChange, type = "text" }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </label>
    );
  }

  return <Info label={label} value={type === "date" ? formatDate(value) : value} />;
}

function SelectField({ label, name, value, editing, onChange, options }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <select
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        >
          <option value="">-- Choisir --</option>
          {options.map((op: string) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return <Info label={label} value={value} />;
}

function TextAreaField({ label, name, value, editing, onChange }: any) {
  if (editing) {
    return (
      <label className="block">
        <span className="text-[12px] font-semibold text-slate-500">{label}</span>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(name, e.target.value)}
          rows={5}
          className="mt-1 w-full border border-slate-200 bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </label>
    );
  }

  return <Info label={label} value={value} />;
}

function PdfPage({ student, printPdfOnly }: any) {
  return (
    <div className="student-pdf-wrapper mx-auto">
      <div className="pdf-mobile-toolbar no-print mb-4 flex justify-end gap-3">
        <button onClick={printPdfOnly} title="Imprimer la fiche PDF" className="w-11 h-11 rounded-full bg-slate-900 text-white text-xl hover:bg-black shadow">
          🖨
        </button>

        <button onClick={() => alert("Drive bientôt disponible")} title="Drive" className="w-11 h-11 rounded-full bg-green-600 text-white text-xl hover:bg-green-700 shadow">
          ☁
        </button>
      </div>

      <div id="pdf-print-area">
        <div className="pdf-page bg-white shadow-2xl w-[850px] min-h-[1180px] p-12 text-[14px] text-black mx-auto">
          <div className="pdf-header flex justify-between items-start mb-8">
            <div>
              <h2 className="font-black text-[18px] uppercase">Strelitzia School</h2>
              <p className="text-[12px]">Année scolaire : {student.anneeScolaire}</p>
              <p className="text-[12px]">Site : {student.site}</p>
            </div>

            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.nom} className="pdf-photo w-[125px] h-[145px] object-cover border" />
            ) : (
              <div className="pdf-photo w-[125px] h-[145px] bg-slate-200 border flex items-center justify-center text-[45px]">
                👤
              </div>
            )}
          </div>

          <h1 className="text-center text-[22px] font-black underline mb-8">
            FICHE DE RENSEIGNEMENT
          </h1>

          <PdfSection title="INFORMATION CONCERNANT L'ÉLÈVE">
            <PdfLine label="Matricule" value={student.matricule} />
            <PdfLine label="Nom" value={student.nom} />
            <PdfLine label="Prénom" value={student.prenoms} />
            <PdfLine label="Date et lieu de naissance" value={`${formatDate(student.dateNaissance)} à ${student.lieuNaissance || "-"}`} />
            <PdfLine label="Sexe" value={student.sexe} />
            <PdfLine label="Classe" value={student.classe} />
            <PdfLine label="Section" value={student.section} />
            <PdfLine label="Téléphone" value={student.contact} />
            <PdfLine label="Adresse" value={student.adresse} />
            <PdfLine label="Signe particulier" value={student.signeParticulier} />
            <PdfLine label="Maladie ou allergique" value={student.maladieAllergie} />
            <PdfLine label="Email" value={student.email} />
          </PdfSection>

          <PdfSection title="INFORMATION CONCERNANT LES PARENTS">
            <PdfLine label="Père" value={student.pereNom} />
            <PdfLine label="Téléphone père" value={student.pereTel} />
            <PdfLine label="Mère" value={student.mereNom} />
            <PdfLine label="Téléphone mère" value={student.mereTel} />
            <PdfLine label="Adresse parents" value={student.parentAdresse} />
          </PdfSection>

          <PdfSection title="INFORMATION CONCERNANT LE TUTEUR">
            <PdfLine label="Tuteur" value={student.tuteurNom} />
            <PdfLine label="Lien" value={student.tuteurLien} />
            <PdfLine label="Téléphone tuteur" value={student.tuteurTel} />
            <PdfLine label="Adresse tuteur" value={student.tuteurAdresse} />
          </PdfSection>

          <PdfSection title="NIVEAU & FRAIS DE FORMATION">
            <PdfLine label="Niveau" value={student.niveau} />
            <PdfLine label="Frais inscription" value={student.fraisInscription} />
            <PdfLine label="Frais scolarité" value={student.fraisScolarite} />
          </PdfSection>

          <PdfSection title="ACTIVITÉS / R-A-S">
            <PdfLine label="Activité" value={student.activite} />
            <PdfLine label="Remarque" value={student.remarque} />
          </PdfSection>
        </div>
      </div>
    </div>
  );
}

function ProCard({ title, subtitle, children }: any) {
  return (
    <div className="max-w-[1100px] mx-auto bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-[24px] font-black text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-1">{subtitle}</p>
      </div>

      <div className="p-8">{children}</div>
    </div>
  );
}

function PdfSection({ title, children }: any) {
  return (
    <section className="pdf-section mb-8">
      <h3 className="text-center font-black underline mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PdfLine({ label, value }: any) {
  return (
    <div className="pdf-line flex gap-2 border-b border-black min-h-[28px] items-end">
      <span className="pdf-line-label font-bold min-w-[220px]">{label} :</span>
      <span className="pdf-line-value">{value || "-"}</span>
    </div>
  );
}

function Grid({ children }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>;
}

function Info({ label, value }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 hover:bg-white transition">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-[16px] font-semibold break-words text-slate-900">
        {value || "-"}
      </p>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
}

function toInputDate(date?: string | null) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}