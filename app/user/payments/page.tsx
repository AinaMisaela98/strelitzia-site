"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  firstname?: string;
  lastname?: string;
  classRoomId?: number;
  classId?: number;
  classeId?: number;
  classe?: string;
};

type TrainingFee = {
  id: number;
  libelle?: string;
  intitule?: string;
  title?: string;
  code?: string;
  montant?: number;
  amount?: number;
};

type Payment = {
  id: number;
  studentId: number;
  trainingFeeId: number;
  montantTotal: number;
  montantPaye: number;
  reste: number;
  status: string;
};

function formatAmount(value: number | string) {
  return String(value || 0)
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function toNumber(value: string | number) {
  return Number(String(value || "").replace(/\s/g, "")) || 0;
}

function studentName(s: Student) {
  return (
    s.name ||
    `${s.lastName || s.lastname || ""} ${s.firstName || s.firstname || ""}`.trim() ||
    `Étudiant #${s.id}`
  );
}

function studentClassId(s: Student) {
  return Number(s.classRoomId || s.classId || s.classeId || 0);
}

export default function StudentPaymentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<TrainingFee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === selectedStudentId),
    [students, selectedStudentId]
  );

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentFeesAndPayments(selectedStudent);
    } else {
      setFees([]);
      setPayments([]);
    }
  }, [selectedStudentId]);

  async function loadStudents() {
    const res = await fetch("/api/payment-students");
    const data = await res.json();
    setStudents(Array.isArray(data) ? data : []);
  }

  async function loadStudentFeesAndPayments(student: Student) {
    const classId = studentClassId(student);

    if (!classId) {
      alert("Cet étudiant n'a pas de classe liée.");
      return;
    }

    setLoading(true);

    try {
      const [feesRes, paymentsRes] = await Promise.all([
        fetch(`/api/training-fees?classRoomId=${classId}`),
        fetch(`/api/student-payments?studentId=${student.id}`),
      ]);

      const feesData = await feesRes.json();
      const paymentsData = await paymentsRes.json();

      setFees(Array.isArray(feesData) ? feesData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } finally {
      setLoading(false);
    }
  }

  function getPayment(feeId: number) {
    return payments.find((p) => p.trainingFeeId === feeId);
  }

  function feeLibelle(fee: TrainingFee) {
    return fee.libelle || fee.intitule || fee.title || "Frais";
  }

  function feeMontant(fee: TrainingFee) {
    return Number(fee.montant || fee.amount || 0);
  }

  async function payFee(fee: TrainingFee) {
    if (!selectedStudent) return;

    const montantTotal = feeMontant(fee);
    const montantPaye = toNumber(amounts[fee.id]);

    if (!montantPaye) {
      alert("Saisir le montant payé.");
      return;
    }

    setPayingId(fee.id);

    try {
      const res = await fetch("/api/student-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          trainingFeeId: fee.id,
          montantTotal,
          montantPaye,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erreur paiement");
        return;
      }

      setAmounts((prev) => ({ ...prev, [fee.id]: "" }));
      await loadStudentFeesAndPayments(selectedStudent);
      printReceipt(fee, montantPaye);
    } finally {
      setPayingId(null);
    }
  }

  function printReceipt(fee: TrainingFee, montantPaye: number) {
    if (!selectedStudent) return;

    const win = window.open("", "_blank", "width=300,height=600");
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Reçu</title>
          <style>
            body {
              width: 58mm;
              font-family: monospace;
              font-size: 11px;
              padding: 6px;
              color: #000;
            }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .bold { font-weight: bold; }
            .row { display: flex; justify-content: space-between; gap: 6px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="center bold">STRELITZIA SCHOOL</div>
          <div class="center">REÇU DE PAIEMENT</div>
          <div class="line"></div>

          <div>Étudiant:</div>
          <div class="bold">${studentName(selectedStudent)}</div>

          <div class="line"></div>

          <div>Frais:</div>
          <div class="bold">${feeLibelle(fee)}</div>

          <div class="row">
            <span>Code</span>
            <span>${fee.code || "-"}</span>
          </div>

          <div class="row">
            <span>Payé</span>
            <span>${formatAmount(montantPaye)} Ar</span>
          </div>

          <div class="line"></div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <br/>
          <div class="center">Merci</div>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-5 text-white shadow-lg">
          <h1 className="text-xl font-bold">Paiement étudiant</h1>
          <p className="text-sm text-blue-100">
            Les frais viennent automatiquement de la classe de l'étudiant.
          </p>
        </div>

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Choisir étudiant
          </label>

          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Sélectionner un étudiant</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {studentName(s)}
              </option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Étudiant: <b>{studentName(selectedStudent)}</b>
            <br />
            Classe ID: <b>{studentClassId(selectedStudent) || "Non liée"}</b>
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-bold text-slate-800">Frais à payer</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-500">Chargement...</div>
          ) : fees.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              Aucun frais trouvé pour cette classe.
            </div>
          ) : (
            <div className="divide-y">
              {fees.map((fee) => {
                const montant = feeMontant(fee);
                const payment = getPayment(fee.id);
                const paid = payment?.status === "PAYE";
                const reste = payment ? payment.reste : montant;
                const dejaPaye = payment ? payment.montantPaye : 0;

                return (
                  <div
                    key={fee.id}
                    className={`p-4 transition ${
                      paid
                        ? "bg-slate-200 text-slate-500"
                        : "bg-white hover:bg-blue-50"
                    }`}
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_120px_150px_150px_210px] md:items-center">
                      <div>
                        <div className="font-bold">
                          {feeLibelle(fee)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Code: {fee.code || "-"}
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="block text-xs text-slate-400">
                          Total
                        </span>
                        <b>{formatAmount(montant)} Ar</b>
                      </div>

                      <div className="text-sm">
                        <span className="block text-xs text-slate-400">
                          Déjà payé
                        </span>
                        <b>{formatAmount(dejaPaye)} Ar</b>
                      </div>

                      <div className="text-sm">
                        <span className="block text-xs text-slate-400">
                          Reste
                        </span>
                        <b className={paid ? "text-slate-500" : "text-red-600"}>
                          {formatAmount(reste)} Ar
                        </b>
                      </div>

                      <div className="flex gap-2">
                        {paid ? (
                          <button
                            disabled
                            className="w-full rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Payé
                          </button>
                        ) : (
                          <>
                            <input
                              value={amounts[fee.id] || ""}
                              onChange={(e) =>
                                setAmounts((prev) => ({
                                  ...prev,
                                  [fee.id]: formatAmount(e.target.value),
                                }))
                              }
                              placeholder="Montant"
                              className="w-full rounded-xl border px-3 py-2 text-sm"
                            />

                            <button
                              onClick={() => payFee(fee)}
                              disabled={payingId === fee.id}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {payingId === fee.id ? "..." : "OK"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}