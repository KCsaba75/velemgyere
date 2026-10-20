import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Check, Sparkles, AlertCircle, Banknote, Wallet } from 'lucide-react';
import { OnsitePaymentMethod } from '../types/database';

interface ProviderRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProviderRegisterModal: React.FC<ProviderRegisterModalProps> = ({ isOpen, onClose }) => {
  const { registerProvider } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<OnsitePaymentMethod[]>(['cash']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePaymentMethod = (method: OnsitePaymentMethod) => {
    setAcceptedPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !companyName.trim() || !contactName.trim() || !email.trim() || !phone.trim() ||
      !description.trim() || password.length < 6 || acceptedPaymentMethods.length === 0
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerProvider({
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim() || undefined,
        description: description.trim(),
        password,
        accepted_payment_methods: acceptedPaymentMethods,
      });
      setSuccessMessage(res.message);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        {!successMessage ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Szolgáltatói Csatlakozás
                </span>
                <h3 className="font-display text-2xl font-extrabold text-stone-900">
                  Regisztráció Szolgáltatóként
                </h3>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 mb-6 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                A regisztrációt követően fiókod <span className="font-semibold underline">pending</span> (függőben lévő) státuszba kerül. A katalógus adminisztrátora ellenőrzi és hagyja jóvá adataidat a programok publikálásához.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Cégnév / Szervezet neve <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Pl. Mecsek Kalandorok Kft."
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Kapcsolattartó neve <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Pl. Kis Tamás"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    E-mail cím <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@kalandorok.hu"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Telefonszám <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+36 30 123 4567"
                    className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Weboldal / Közösségi média cím <span className="text-stone-400 font-normal">(opcionális)</span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://pelda.hu"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Rövid bemutatkozás <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Milyen kirándulásokat, túrákat vagy élményeket szerveztek, mióta tevékenykedtek a területen?"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Elfogadott fizetési mód helyszínen <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => togglePaymentMethod('cash')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                      acceptedPaymentMethods.includes('cash')
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Készpénz
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePaymentMethod('revolut')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                      acceptedPaymentMethods.includes('revolut')
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" /> Revolut
                  </button>
                </div>
                {acceptedPaymentMethods.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1.5">Legalább egy fizetési módot ki kell választanod.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Jelszó (min. 6 karakter) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || acceptedPaymentMethods.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Regisztráció...' : 'Szolgáltatói regisztráció elküldése'}</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="font-display text-2xl font-extrabold text-stone-900 mb-2">
              Sikeres regisztráció!
            </h3>
            <p className="text-sm text-stone-600 mb-6 max-w-sm mx-auto">
              {successMessage}
            </p>
            <button
              onClick={onClose}
              className="bg-stone-900 hover:bg-stone-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm cursor-pointer"
            >
              Belépés a Szolgáltatói Dashboardra
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
