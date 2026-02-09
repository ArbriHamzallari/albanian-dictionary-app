import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X, ChevronDown, ChevronUp, Users, UserPlus, Activity, CalendarDays, CalendarRange, BarChart3, Target, Gamepad2, Flame, Trophy } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const CATEGORIES = ['Folje', 'Emër', 'Mbiemër', 'Ndajfolje'];

const emptyWord = {
  borrowed_word: '',
  correct_albanian: '',
  category: 'Emër',
  difficulty_level: '',
  definitions: [{ definition_text: '', example_sentence: '', definition_order: 1 }],
  conjugations: [],
};

const AdminDashboard = () => {
  const { token, isLoggedIn, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [topSearches, setTopSearches] = useState([]);
  const [words, setWords] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  // Word form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...emptyWord });
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  // Expanded sections
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get('/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
      setMetrics(res.data);
    } catch {
      // silently fail — main data still loads
    } finally {
      setMetricsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) return;

    if (!isLoggedIn || !isAdmin) {
      setError('Duhet të hyni si admin për të parë këtë faqe.');
      setLoading(false);
      if (!isLoggedIn) {
        navigate('/admin', { replace: true });
      }
      return;
    }
    fetchAll();
    fetchMetrics();

    // Auto-refresh metrics every 30 seconds
    const metricsInterval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(metricsInterval);
  }, [authLoading, isLoggedIn, isAdmin, token]);

  const fetchAll = async () => {
    try {
      const [sugRes, searchRes, wordsRes] = await Promise.all([
        api.get('/suggestions', { headers }),
        api.get('/admin/analytics/top-searches', { headers }),
        api.get('/admin/words', { headers }),
      ]);
      setSuggestions(sugRes.data.suggestions || []);
      setTopSearches(searchRes.data.top_searches || []);
      setWords(wordsRes.data.words || []);
    } catch {
      setError('Nuk mund të ngarkohen të dhënat e adminit.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = async (id, action) => {
    try {
      await api.put(`/suggestions/${id}/${action}`, null, { headers });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      flash('Propozimi u përditësua!');
    } catch {
      setError('Gabim gjatë përditësimit.');
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ ...emptyWord, definitions: [{ definition_text: '', example_sentence: '', definition_order: 1 }], conjugations: [] });
    setShowForm(true);
  };

  const openEditForm = (word) => {
    setEditingId(word.id);
    setFormData({
      borrowed_word: word.borrowed_word,
      correct_albanian: word.correct_albanian,
      category: word.category || 'Emër',
      difficulty_level: word.difficulty_level || '',
      definitions: word.definitions?.length
        ? word.definitions.map((d) => ({
            definition_text: d.definition_text,
            example_sentence: d.example_sentence || '',
            definition_order: d.definition_order || 1,
          }))
        : [{ definition_text: '', example_sentence: '', definition_order: 1 }],
      conjugations: word.conjugations?.length
        ? word.conjugations.map((c) => ({
            conjugation_type: c.conjugation_type,
            conjugation_text: c.conjugation_text,
          }))
        : [],
    });
    setShowForm(true);
  };

  const saveWord = async () => {
    if (!formData.borrowed_word.trim() || !formData.correct_albanian.trim()) {
      setError('Plotëso fushat e nevojshme.');
      return;
    }
    const defs = formData.definitions.filter((d) => d.definition_text.trim());
    if (!defs.length) {
      setError('Shto të paktën një përkufizim.');
      return;
    }

    setFormLoading(true);
    setError('');

    const payload = {
      ...formData,
      definitions: defs,
      conjugations: formData.conjugations.filter((c) => c.conjugation_type && c.conjugation_text),
    };

    try {
      if (editingId) {
        await api.put(`/admin/words/${editingId}`, payload, { headers });
        flash('Fjala u përditësua me sukses! ✅');
      } else {
        await api.post('/admin/words', payload, { headers });
        flash('Fjala u shtua me sukses! ✅');
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Gabim gjatë ruajtjes.');
    } finally {
      setFormLoading(false);
    }
  };

  const deleteWord = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/words/${deleteId}`, { headers });
      setWords((prev) => prev.filter((w) => w.id !== deleteId));
      setDeleteId(null);
      flash('Fjala u fshi me sukses!');
    } catch {
      setError('Gabim gjatë fshirjes.');
    }
  };

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const addDefinition = () => {
    setFormData((p) => ({
      ...p,
      definitions: [...p.definitions, { definition_text: '', example_sentence: '', definition_order: p.definitions.length + 1 }],
    }));
  };

  const addConjugation = () => {
    setFormData((p) => ({
      ...p,
      conjugations: [...p.conjugations, { conjugation_type: '', conjugation_text: '' }],
    }));
  };

  const updateDef = (index, field, value) => {
    setFormData((p) => ({
      ...p,
      definitions: p.definitions.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    }));
  };

  const updateConj = (index, field, value) => {
    setFormData((p) => ({
      ...p,
      conjugations: p.conjugations.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const removeDef = (index) => {
    if (formData.definitions.length <= 1) return;
    setFormData((p) => ({ ...p, definitions: p.definitions.filter((_, i) => i !== index) }));
  };

  const removeConj = (index) => {
    setFormData((p) => ({ ...p, conjugations: p.conjugations.filter((_, i) => i !== index) }));
  };

  const filteredWords = searchQ
    ? words.filter((w) =>
        w.borrowed_word.toLowerCase().includes(searchQ.toLowerCase()) ||
        w.correct_albanian.toLowerCase().includes(searchQ.toLowerCase())
      )
    : words;

  if (loading) return <div className="max-w-6xl mx-auto px-6 py-10"><LoadingSpinner /></div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-black text-heading dark:text-dark-text mb-6">
        ADMIN PANEL – Fjalingo
      </h2>

      <ErrorMessage message={error} />
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-fjalingo-green/10 border-2 border-fjalingo-green/20 text-fjalingo-green px-5 py-4 rounded-2xl font-semibold mb-4"
        >
          {success}
        </motion.div>
      )}

      {/* ── Platform Statistics ───────────────────────────── */}
      <div className="card mb-8">
        <h3 className="text-sm font-black text-fjalingo-blue mb-5">📊 STATISTIKAT E PLATFORMËS</h3>
        {metricsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-card dark:bg-dark-card rounded-2xl p-4 animate-pulse">
                <div className="h-3 w-16 bg-border dark:bg-dark-border rounded mb-3" />
                <div className="h-7 w-12 bg-border dark:bg-dark-border rounded" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard icon={Users} label="Përdorues" value={metrics.totalUsers} color="blue" />
            <MetricCard icon={UserPlus} label="Të Rinj Sot" value={metrics.newUsersToday} color="green" />
            <MetricCard icon={Activity} label="DAU" value={metrics.activeUsersToday} color="purple" />
            <MetricCard icon={CalendarDays} label="WAU" value={metrics.activeUsers7d} color="orange" />
            <MetricCard icon={CalendarRange} label="MAU" value={metrics.activeUsers30d} color="blue" />
            <MetricCard icon={BarChart3} label="Mbajtja %" value={`${metrics.retentionRate}%`} color="green" />
            <MetricCard icon={Target} label="Saktësia %" value={`${metrics.avgAccuracy}%`} color="purple" />
            <MetricCard icon={Gamepad2} label="Kuiz/Përdorues" value={metrics.avgQuizzesPerUser} color="orange" />
            <MetricCard icon={Flame} label="Seria Top" value={metrics.topStreak} color="red" suffix="🔥" />
            <MetricCard icon={Trophy} label="Kuize Totale" value={metrics.totalQuizzesPlayed} color="blue" />
          </div>
        ) : (
          <p className="text-sm text-muted dark:text-dark-muted">Nuk mund të ngarkohen metrikat.</p>
        )}
      </div>

      {/* Top section: stats + suggestions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Top Searches */}
        <div className="card">
          <h3 className="text-sm font-black text-fjalingo-blue mb-4">🔍 KËRKIMET MË TË SHPESHTA</h3>
          <div className="space-y-2">
            {topSearches.map((s, i) => (
              <div key={s.search_term} className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-heading dark:text-dark-text">
                  {i + 1}. {s.search_term}
                </span>
                <span className="badge badge-blue">{s.total}</span>
              </div>
            ))}
            {!topSearches.length && <p className="text-sm text-muted">Nuk ka të dhëna ende.</p>}
          </div>
        </div>

        {/* Suggestions */}
        <div className="card">
          <button onClick={() => setShowSuggestions(!showSuggestions)} className="flex items-center justify-between w-full mb-4">
            <h3 className="text-sm font-black text-fjalingo-purple">💡 PROPOZIME ({suggestions.filter((s) => s.status === 'pending').length})</h3>
            {showSuggestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showSuggestions && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {suggestions.filter((s) => s.status === 'pending').map((s) => (
                <div key={s.id} className="card py-3 px-4">
                  <p className="font-bold text-heading dark:text-dark-text text-sm">
                    "{s.borrowed_word}" → {s.suggested_albanian || 'Pa sugjerim'}
                  </p>
                  {s.suggested_definition && <p className="text-xs text-muted mt-1">{s.suggested_definition}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleSuggestion(s.id, 'approve')} className="text-xs font-bold text-fjalingo-green hover:underline">Aprovo</button>
                    <button onClick={() => handleSuggestion(s.id, 'reject')} className="text-xs font-bold text-fjalingo-red hover:underline">Refuzo</button>
                  </div>
                </div>
              ))}
              {!suggestions.filter((s) => s.status === 'pending').length && (
                <p className="text-sm text-muted">Nuk ka propozime të pashqyrtuara.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* All Words */}
      <div className="card mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-black text-heading dark:text-dark-text">
            📚 TË GJITHA FJALËT ({words.length})
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-white dark:bg-dark-bg border-2 border-border dark:border-dark-border rounded-xl px-3 flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-muted" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Kërko..."
                className="py-2 px-2 text-sm font-semibold bg-transparent text-heading dark:text-dark-text focus:outline-none w-full sm:w-40"
              />
            </div>
            <button onClick={openAddForm} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> Shto
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border dark:border-dark-border">
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">Huazuar</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted">Shqipe</th>
                <th className="text-left py-3 px-2 font-bold text-muted dark:text-dark-muted hidden sm:table-cell">Kategoria</th>
                <th className="text-right py-3 px-2 font-bold text-muted dark:text-dark-muted">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((w) => (
                <tr key={w.id} className="border-b border-border/50 dark:border-dark-border/50 hover:bg-card dark:hover:bg-dark-card transition">
                  <td className="py-3 px-2 font-semibold text-heading dark:text-dark-text">{w.borrowed_word}</td>
                  <td className="py-3 px-2 font-bold text-fjalingo-green">{w.correct_albanian}</td>
                  <td className="py-3 px-2 hidden sm:table-cell">
                    <span className="badge badge-blue">{w.category || '—'}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button onClick={() => openEditForm(w)} className="p-1.5 rounded-lg hover:bg-fjalingo-blue/10 text-fjalingo-blue transition mr-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(w.id)} className="p-1.5 rounded-lg hover:bg-fjalingo-red/10 text-fjalingo-red transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredWords.length && (
            <p className="text-center text-muted py-8">Nuk u gjetën fjalë.</p>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-heading dark:text-dark-text">
                  {editingId ? '✏️ Ndrysho Fjalën' : '➕ Shto Fjalë të Re'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-card dark:hover:bg-dark-card rounded-xl transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Fjala e huazuar *</label>
                    <input value={formData.borrowed_word} onChange={(e) => setFormData((p) => ({ ...p, borrowed_word: e.target.value }))} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Fjala e saktë shqipe *</label>
                    <input value={formData.correct_albanian} onChange={(e) => setFormData((p) => ({ ...p, correct_albanian: e.target.value }))} className="input-field" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted dark:text-dark-muted mb-1">Kategoria</label>
                  <select value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} className="input-field">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Definitions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted dark:text-dark-muted">Përkufizimet *</label>
                    <button type="button" onClick={addDefinition} className="text-xs font-bold text-fjalingo-green hover:underline">
                      + Shto përkufizim
                    </button>
                  </div>
                  {formData.definitions.map((d, i) => (
                    <div key={i} className="card py-3 px-4 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted">Përkufizimi {i + 1}</span>
                        {formData.definitions.length > 1 && (
                          <button onClick={() => removeDef(i)} className="text-xs text-fjalingo-red hover:underline">Hiq</button>
                        )}
                      </div>
                      <input
                        value={d.definition_text}
                        onChange={(e) => updateDef(i, 'definition_text', e.target.value)}
                        placeholder="Përkufizimi..."
                        className="input-field mb-2"
                      />
                      <input
                        value={d.example_sentence}
                        onChange={(e) => updateDef(i, 'example_sentence', e.target.value)}
                        placeholder="Shembulli (opsional)..."
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                {/* Conjugations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-muted dark:text-dark-muted">Zgjedhimet (opsional)</label>
                    <button type="button" onClick={addConjugation} className="text-xs font-bold text-fjalingo-green hover:underline">
                      + Shto zgjedhim
                    </button>
                  </div>
                  {formData.conjugations.map((c, i) => (
                    <div key={i} className="card py-3 px-4 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted">Zgjedhimi {i + 1}</span>
                        <button onClick={() => removeConj(i)} className="text-xs text-fjalingo-red hover:underline">Hiq</button>
                      </div>
                      <select
                        value={c.conjugation_type}
                        onChange={(e) => updateConj(i, 'conjugation_type', e.target.value)}
                        className="input-field mb-2"
                      >
                        <option value="">Zgjidh llojin...</option>
                        <option value="E tashmja">E tashmja</option>
                        <option value="E kryer">E kryer</option>
                        <option value="E ardhmja">E ardhmja</option>
                        <option value="Pjesorja">Pjesorja</option>
                      </select>
                      <input
                        value={c.conjugation_text}
                        onChange={(e) => updateConj(i, 'conjugation_text', e.target.value)}
                        placeholder="Zgjedhimi..."
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={saveWord} disabled={formLoading} className="btn-primary flex-1">
                    {formLoading ? 'Duke ruajtur...' : editingId ? 'Përditëso Fjalën' : 'Ruaj Fjalën'}
                  </button>
                  <button onClick={() => setShowForm(false)} className="btn-outline flex-1">
                    Anulo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-bg rounded-2xl shadow-xl w-full max-w-sm p-6 text-center"
            >
              <span className="text-4xl block mb-4">⚠️</span>
              <h3 className="text-lg font-black text-heading dark:text-dark-text mb-2">Fshi Fjalën?</h3>
              <p className="text-sm text-muted dark:text-dark-muted mb-6">
                Je i sigurt që dëshiron të fshish këtë fjalë? Ky veprim nuk kthehet mbrapsht.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-outline flex-1">Anulo</button>
                <button onClick={deleteWord} className="bg-fjalingo-red text-white font-bold py-3 px-8 rounded-xl shadow-button transition-all hover:brightness-110 flex-1">
                  Fshij
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Metric Card sub-component ──────────────────────────────
const COLOR_MAP = {
  blue: 'bg-fjalingo-blue/10 text-fjalingo-blue',
  green: 'bg-fjalingo-green/10 text-fjalingo-green',
  purple: 'bg-fjalingo-purple/10 text-fjalingo-purple',
  orange: 'bg-fjalingo-orange/10 text-fjalingo-orange',
  red: 'bg-fjalingo-red/10 text-fjalingo-red',
};

const MetricCard = ({ icon: Icon, label, value, color = 'blue', suffix = '' }) => (
  <div className="bg-card dark:bg-dark-card rounded-2xl p-4 flex flex-col gap-1">
    <div className="flex items-center gap-2 mb-1">
      <span className={`p-1.5 rounded-lg ${COLOR_MAP[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-[11px] font-bold text-muted dark:text-dark-muted uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="text-xl font-black text-heading dark:text-dark-text leading-none">
      {value}{suffix && <span className="ml-1">{suffix}</span>}
    </span>
  </div>
);

export default AdminDashboard;
