import { useEffect, useState, type FormEvent } from "react";
import axios from "../api/axios";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

type GradeFee = {
  _id: string;
  grade: string;
  amount: string | number;
};

type GeneratedCredentials = {
  studentId: string;
  password: string;
};

type GuardianForm = {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
  address: string;
  primary: boolean;
};

type GuardianCredential = {
  parentId: string;
  fullName: string;
  email: string | null;
  password: string | null;
  primary?: boolean;
};

type StudentRegistrationResponse = {
  credentials?: GeneratedCredentials | null;
  guardianCredentials?: GuardianCredential[];
  parentCredentials?: GuardianCredential | null;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const initialForm = {
  name: "",
  email: "",
  grade: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  address: "",
  fatherName: "",
  motherName: "",
  guardianName: "",
  occupation: "",
  notes: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  parentRelationship: "",
  parentAddress: "",
};

const createGuardian = (primary = false): GuardianForm => ({
  fullName: "",
  email: "",
  phone: "",
  relationship: "Guardian",
  address: "",
  primary,
});

export default function RegisterStudentEnhanced() {
  const [formData, setFormData] = useState(initialForm);
  const [guardianContacts, setGuardianContacts] = useState<GuardianForm[]>([
    createGuardian(true),
  ]);
  const [gradeFees, setGradeFees] = useState<GradeFee[]>([]);
  const [generatedCredentials, setGeneratedCredentials] =
    useState<GeneratedCredentials | null>(null);
  const [guardianCredentials, setGuardianCredentials] = useState<
    GuardianCredential[]
  >([]);
  const [buttonsLocked, setButtonsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const res = await axios.get<GradeFee[]>("/students/grade-fee");
        setGradeFees(res.data);
      } catch (err) {
        console.error("Failed to load grade fees", err);
      }
    };
    fetchFees();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (buttonsLocked || isSubmitting) return;

    setButtonsLocked(true);
    setIsSubmitting(true);
    try {
      const activeGuardians = guardianContacts.filter(
        (guardian) => guardian.fullName || guardian.email || guardian.phone,
      );
      const primaryGuardian =
        activeGuardians.find((guardian) => guardian.primary) ||
        activeGuardians[0];

      const response = await axios.post<StudentRegistrationResponse>(
        "/students",
        {
          ...formData,
          guardians: activeGuardians,
          personalDetails: {
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            phone: formData.phone,
            address: formData.address,
          },
          familyBackground: {
            fatherName: formData.fatherName,
            motherName: formData.motherName,
            guardianName: primaryGuardian?.fullName || formData.guardianName,
            occupation: formData.occupation,
            notes: formData.notes,
          },
          ...(primaryGuardian
            ? {
                parent: {
                  fullName: primaryGuardian.fullName,
                  email: primaryGuardian.email,
                  phone: primaryGuardian.phone,
                  relationship: primaryGuardian.relationship,
                  address: primaryGuardian.address,
                },
              }
            : {}),
        },
      );

      setGeneratedCredentials(response.data.credentials || null);
      setGuardianCredentials(response.data.guardianCredentials || []);
      setFormData(initialForm);
      setGuardianContacts([createGuardian(true)]);
    } catch (err: unknown) {
      const error = err as ApiError;
      toast.error(error.response?.data?.message || "Error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateGuardian = (
    index: number,
    key: keyof GuardianForm,
    value: string | boolean,
  ) => {
    setGuardianContacts((current) =>
      current.map((guardian, guardianIndex) => {
        if (guardianIndex !== index) return guardian;
        return {
          ...guardian,
          [key]: value,
        };
      }),
    );
  };

  const addGuardian = () => {
    setGuardianContacts((current) => [...current, createGuardian(false)]);
  };

  const removeGuardian = (index: number) => {
    setGuardianContacts((current) => {
      if (current.length === 1) return current;
      const next = current.filter(
        (_, guardianIndex) => guardianIndex !== index,
      );
      if (!next.some((guardian) => guardian.primary) && next[0]) {
        next[0] = { ...next[0], primary: true };
      }
      return next;
    });
  };

  const setPrimaryGuardian = (index: number) => {
    setGuardianContacts((current) =>
      current.map((guardian, guardianIndex) => ({
        ...guardian,
        primary: guardianIndex === index,
      })),
    );
  };

  const isLocked = buttonsLocked || isSubmitting;

  const lockButtons = () => {
    setButtonsLocked(true);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar
        actionsDisabled={buttonsLocked || isSubmitting}
        onAction={lockButtons}
      />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-4xl border border-white/50 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-slate-950 px-8 py-10 text-white sm:px-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
                Registrar
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Create student accounts with one clean form.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Student email is optional. The system generates a Student ID and
                password automatically.
              </p>

              <div className="mt-8 space-y-4">
                {gradeFees.slice(0, 3).map((gf) => (
                  <div
                    key={gf._id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    <span className="font-semibold text-white">
                      Grade {gf.grade}
                    </span>
                    <span className="ml-2 text-slate-300">
                      • ETB {gf.amount}
                    </span>
                  </div>
                ))}
                {gradeFees.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    No fee rules configured yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Registration
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                  Register Student
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add a student, parent link, and family background in one pass.
                </p>
              </div>

              {(generatedCredentials || guardianCredentials.length > 0) && (
                <div className="mb-5 space-y-3">
                  {generatedCredentials && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <div className="font-semibold">
                        Generated student credentials
                      </div>
                      <div>Student ID: {generatedCredentials.studentId}</div>
                      <div>Password: {generatedCredentials.password}</div>
                    </div>
                  )}
                  {guardianCredentials.length > 0 && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      <div className="font-semibold">Guardian access</div>
                      <div className="mt-2 space-y-2">
                        {guardianCredentials.map((guardian) => (
                          <div
                            key={guardian.parentId}
                            className="rounded-xl border border-blue-200/70 bg-white px-3 py-2"
                          >
                            <div className="font-semibold text-slate-900">
                              {guardian.fullName}
                            </div>
                            <div>Parent ID: {guardian.parentId}</div>
                            {guardian.email && (
                              <div>Email: {guardian.email}</div>
                            )}
                            {guardian.password ? (
                              <div>Password: {guardian.password}</div>
                            ) : (
                              <div>Existing account linked to student</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Full Name
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Student Email (optional)
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Target Grade
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      required
                      value={formData.grade}
                      onChange={(e) =>
                        setFormData({ ...formData, grade: e.target.value })
                      }
                    >
                      <option value="">Select Grade</option>
                      {gradeFees.map((gf) => (
                        <option key={gf._id} value={gf.grade}>
                          Grade {gf.grade} (ETB {gf.amount})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Gender
                    </label>
                    <input
                      type="text"
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2 border-t border-slate-200 pt-4">
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Family background
                    </h4>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Father Name
                    </label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) =>
                        setFormData({ ...formData, fatherName: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Mother Name
                    </label>
                    <input
                      type="text"
                      value={formData.motherName}
                      onChange={(e) =>
                        setFormData({ ...formData, motherName: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Guardian Name
                    </label>
                    <input
                      type="text"
                      value={formData.guardianName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          guardianName: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Occupation
                    </label>
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) =>
                        setFormData({ ...formData, occupation: e.target.value })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Background Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2 border-t border-slate-200 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Guardian contacts
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          lockButtons();
                          addGuardian();
                        }}
                        disabled={isLocked}
                        className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-2">
                          Add guardian
                          {isLocked && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                              Pending
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>

                  {guardianContacts.map((guardian, index) => (
                    <div
                      key={`guardian-${index}`}
                      className="sm:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Guardian #{index + 1}
                          </p>
                          <p className="text-xs text-slate-500">
                            Add one or more guardians. Mark the primary contact.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="radio"
                              name="primaryGuardian"
                              checked={guardian.primary}
                              onChange={() => setPrimaryGuardian(index)}
                              className="h-4 w-4 accent-blue-600"
                            />
                            Primary
                          </label>
                          {guardianContacts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                lockButtons();
                                removeGuardian(index);
                              }}
                              disabled={isLocked}
                              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className="inline-flex items-center gap-2">
                                Remove
                                {isLocked && (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                                    Pending
                                  </span>
                                )}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required={index === 0}
                            value={guardian.fullName}
                            onChange={(e) =>
                              updateGuardian(index, "fullName", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                          />
                          {index === 0 && (
                            <p className="mt-2 text-xs text-slate-500">
                              The first guardian is required and will be used as
                              the primary contact.
                            </p>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Email
                          </label>
                          <input
                            type="email"
                            value={guardian.email}
                            onChange={(e) =>
                              updateGuardian(index, "email", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={guardian.phone}
                            onChange={(e) =>
                              updateGuardian(index, "phone", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Relationship
                          </label>
                          <input
                            type="text"
                            value={guardian.relationship}
                            onChange={(e) =>
                              updateGuardian(
                                index,
                                "relationship",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Address
                          </label>
                          <input
                            type="text"
                            value={guardian.address}
                            onChange={(e) =>
                              updateGuardian(index, "address", e.target.value)
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  onClick={lockButtons}
                  disabled={isLocked}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-linear-to-r from-blue-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      Registering...
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        Pending
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Register Student
                      {buttonsLocked && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                          Pending
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
