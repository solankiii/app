import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import api from '@/src/api/client';

const PRESET_CITIES = ['Pune', 'Mumbai', 'Delhi', 'Bangalore'];
const TARGET_PRESETS = [50, 100, 200, 500, 1000];
// Enrich in chunks well under the backend's per-job cap so any batch size works
// and the (free-tier) backend never has to hold one huge job in memory.
const ENRICH_CHUNK_SIZE = 500;

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
  else Alert.alert(title, message);
};

type BusinessType = { name: string; count: number };
type LeadRow = {
  full_name: string;
  phone_number: string;
  company_name: string;
  city: string;
  industry: string;
  source: string;
  notes?: string;
  address?: string;
  website?: string;
  rating?: number | null;
  total_reviews?: number | null;
  google_maps_link?: string;
  business_status?: string;
  currently_open?: string;
  // Enrichment evidence
  enriched?: boolean;
  email?: string;
  website_title?: string;
  website_fetch_status?: string;
  instagram_url?: string;
  instagram_handle?: string;
  instagram_followers?: string;
  instagram_profile_name?: string;
  linkedin_url?: string;
  linkedin_profile_name?: string;
  facebook_url?: string;
  youtube_url?: string;
  whatsapp_url?: string;
};
type Combo = { city: string; business_type: string; leads: LeadRow[] };
type EnrichProgress = {
  phase: string;
  done: number;
  total: number;
  chunkIdx: number;
  chunkCount: number;
  withWebsite?: number;
};

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

const fmtElapsed = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

export default function BulkLeadScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [keyTested, setKeyTested] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingKey, setTestingKey] = useState(false);

  const [cities, setCities] = useState<string[]>(['Pune']);
  const [customCity, setCustomCity] = useState('');

  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([{ name: '', count: 200 }]);

  const [comprehensive, setComprehensive] = useState(true);
  const [filterRating, setFilterRating] = useState(false);
  const [minRating, setMinRating] = useState('3.0');
  const [filterReviews, setFilterReviews] = useState(false);
  const [minReviews, setMinReviews] = useState('5');
  const [filterPhone, setFilterPhone] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [combos, setCombos] = useState<Combo[] | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [fetchSocial, setFetchSocial] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichProgress | null>(null);
  const [enrichStartedAt, setEnrichStartedAt] = useState<number | null>(null);
  const cancelEnrichRef = useRef(false);

  useEffect(() => {
    api.get('/users/sales').then(r => setSalesUsers(r.data || [])).catch(() => {});
  }, []);

  const totalTarget = businessTypes.reduce((s, bt) => s + (bt.count || 0), 0) * Math.max(cities.length, 1);
  const rawEstimate = Math.round(((totalTarget / 20) + 10) * 0.032 * 100) / 100;

  const toggleCity = (c: string) => {
    setCities(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const addCustomCity = () => {
    const c = customCity.trim();
    if (!c) return;
    if (!cities.includes(c)) setCities(prev => [...prev, c]);
    setCustomCity('');
  };

  const updateBt = (i: number, field: keyof BusinessType, v: any) => {
    setBusinessTypes(prev => prev.map((bt, idx) => idx === i ? { ...bt, [field]: v } : bt));
  };

  const addBt = () => setBusinessTypes(prev => [...prev, { name: '', count: 100 }]);
  const removeBt = (i: number) => setBusinessTypes(prev => prev.filter((_, idx) => idx !== i));

  const testKey = async () => {
    if (!apiKey.trim()) {
      showMessage('Error', 'Enter an API key first');
      return;
    }
    setTestingKey(true);
    setKeyTested(null);
    try {
      const res = await api.post('/leads/test-places-key', { api_key: apiKey.trim() });
      setKeyTested(res.data);
    } catch (e: any) {
      setKeyTested({ ok: false, message: e.response?.data?.detail || e.message || 'Failed' });
    } finally {
      setTestingKey(false);
    }
  };

  const generate = async () => {
    if (!apiKey.trim()) { showMessage('Error', 'Enter Google Places API key'); return; }
    const cleanTypes = businessTypes.filter(bt => bt.name.trim());
    if (!cleanTypes.length) { showMessage('Error', 'Add at least one business type'); return; }
    if (!cities.length) { showMessage('Error', 'Pick at least one city'); return; }

    setGenerating(true);
    setCombos(null);
    setEstimatedCost(null);
    setEnriched(false);
    setEnrichProgress(null);
    try {
      const res = await api.post('/leads/generate-preview', {
        api_key: apiKey.trim(),
        cities,
        business_types: cleanTypes.map(bt => ({ name: bt.name.trim(), count: bt.count })),
        comprehensive,
        filter_rating: filterRating,
        min_rating: filterRating ? parseFloat(minRating) || 3.0 : undefined,
        filter_reviews: filterReviews,
        min_reviews: filterReviews ? parseInt(minReviews, 10) || 0 : undefined,
        filter_phone: filterPhone,
      }, { timeout: 600000 });
      setCombos(res.data.combos || []);
      setEstimatedCost(res.data.estimated_cost ?? null);
      if (!res.data.combos?.length || res.data.total === 0) {
        showMessage('No Results', 'No businesses found. Try different search terms or disable filters.');
      }
    } catch (e: any) {
      showMessage('Error', e.response?.data?.detail || e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const enrichAll = async () => {
    if (!combos) return;
    const flat = combos.flatMap(c => c.leads);
    if (!flat.length) { showMessage('Error', 'No leads to enrich'); return; }

    cancelEnrichRef.current = false;
    const chunkCount = Math.ceil(flat.length / ENRICH_CHUNK_SIZE);
    const allResults: LeadRow[] = [];
    setEnriching(true);
    setEnrichStartedAt(Date.now());
    setEnrichProgress({ phase: 'starting', done: 0, total: flat.length, chunkIdx: 0, chunkCount });
    try {
      // Split into chunks so large batches stay under the backend per-job cap
      // and run as sequential jobs with one combined progress bar.
      for (let start = 0, ci = 0; start < flat.length; start += ENRICH_CHUNK_SIZE, ci++) {
        if (cancelEnrichRef.current) throw new Error('__cancelled__');
        const chunk = flat.slice(start, start + ENRICH_CHUNK_SIZE);
        const res = await api.post(
          '/leads/enrich-start',
          { leads: chunk, skip_social: !fetchSocial },
          { timeout: 60000 },
        );
        const jobId = res.data.job_id;
        if (!jobId) throw new Error('No job id returned');

        // Poll for completion. The job keeps running on the backend even if a
        // single status request is slow, so tolerate transient poll failures
        // instead of aborting the whole enrichment.
        let pollFails = 0;
        while (true) {
          if (cancelEnrichRef.current) throw new Error('__cancelled__');
          await sleep(2000);
          let job: any;
          try {
            const st = await api.get(`/leads/enrich-status/${jobId}`, { timeout: 45000 });
            job = st.data;
            pollFails = 0;
          } catch {
            pollFails += 1;
            if (pollFails >= 8) {
              throw new Error('Lost connection to the enrichment job (backend busy). It may still be running — retry in a minute.');
            }
            continue; // transient timeout/network blip — keep polling
          }
          setEnrichProgress({
            phase: job.phase,
            done: allResults.length + (job.done || 0),
            total: flat.length,
            chunkIdx: ci + 1,
            chunkCount,
            withWebsite: job.with_website,
          });
          if (job.status === 'done') {
            allResults.push(...((job.results as LeadRow[]) || []));
            break;
          }
          if (job.status === 'error') {
            throw new Error(job.error || 'Enrichment job failed');
          }
        }
      }

      // Redistribute enriched rows back into combos in original order.
      let idx = 0;
      const newCombos = combos.map(c => {
        const slice = allResults.slice(idx, idx + c.leads.length);
        idx += c.leads.length;
        return { ...c, leads: slice.length ? slice : c.leads };
      });
      setCombos(newCombos);
      setEnriched(true);
      showMessage('Done', `Enriched ${allResults.length} leads${fetchSocial ? ' with website + social data' : ' (website + social links)'}.`);
    } catch (e: any) {
      if (e?.message === '__cancelled__') {
        showMessage('Stopped', `Enrichment cancelled after ${allResults.length} of ${flat.length} leads. Nothing was changed — adjust options and re-run.`);
      } else {
        showMessage('Error', e.response?.data?.detail || e.message || 'Enrichment failed');
      }
    } finally {
      setEnriching(false);
      setEnrichProgress(null);
    }
  };

  const importAll = async () => {
    if (!combos) return;
    const allLeads = combos.flatMap(c => c.leads);
    if (!allLeads.length) { showMessage('Error', 'No leads to import'); return; }

    setImporting(true);
    try {
      const res = await api.post('/leads/import-generated', {
        leads: allLeads,
        assigned_to: assignedTo || undefined,
      }, { timeout: 180000 });
      showMessage('Success', `${res.data.created} leads imported${res.data.skipped ? `, ${res.data.skipped} skipped` : ''}`);
      router.replace('/admin/leads');
    } catch (e: any) {
      showMessage('Error', e.response?.data?.detail || e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const totalPreview = combos?.reduce((s, c) => s + c.leads.length, 0) ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Ionicons name="sparkles" size={24} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Generate Leads from Google Maps</Text>
          <Text style={styles.headerText}>
            Enter your Google Places API key, pick cities + business types, and generate leads without leaving the CRM.
          </Text>
        </View>
      </View>

      {/* API Key */}
      <Text style={styles.sectionTitle}>Google Places API Key</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={(t) => { setApiKey(t); setKeyTested(null); }}
          placeholder="Paste your API key"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.testBtn, (testingKey || !apiKey.trim()) && { opacity: 0.5 }]}
          onPress={testKey}
          disabled={testingKey || !apiKey.trim()}
        >
          {testingKey ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.testBtnText}>Test Key</Text>}
        </TouchableOpacity>
      </View>
      {keyTested && (
        <View style={[styles.keyStatus, keyTested.ok ? styles.keyOk : styles.keyErr]}>
          <Ionicons
            name={keyTested.ok ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={keyTested.ok ? Colors.success : Colors.danger}
          />
          <Text style={[styles.keyStatusText, { color: keyTested.ok ? Colors.success : Colors.danger }]}>
            {keyTested.message}
          </Text>
        </View>
      )}

      {/* Cities */}
      <Text style={styles.sectionTitle}>Cities</Text>
      <View style={styles.chipRow}>
        {PRESET_CITIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, cities.includes(c) && styles.chipActive]}
            onPress={() => toggleCity(c)}
          >
            <Text style={[styles.chipText, cities.includes(c) && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
        {cities.filter(c => !PRESET_CITIES.includes(c)).map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, styles.chipActive]}
            onPress={() => toggleCity(c)}
          >
            <Text style={[styles.chipText, styles.chipTextActive]}>{c} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={customCity}
          onChangeText={setCustomCity}
          placeholder="Add custom city (e.g. Chennai)"
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={addCustomCity}
        />
        <TouchableOpacity
          style={[styles.testBtn, !customCity.trim() && { opacity: 0.5 }]}
          onPress={addCustomCity}
          disabled={!customCity.trim()}
        >
          <Text style={styles.testBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Business Types */}
      <Text style={styles.sectionTitle}>Business Types</Text>
      {businessTypes.map((bt, i) => (
        <View key={i} style={styles.btRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={bt.name}
            onChangeText={(t) => updateBt(i, 'name', t)}
            placeholder="e.g. restaurants, gyms, dentists"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={String(bt.count)}
            onChangeText={(t) => updateBt(i, 'count', parseInt(t, 10) || 0)}
            placeholder="200"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />
          {businessTypes.length > 1 && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeBt(i)}>
              <Ionicons name="close" size={18} color={Colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addBt}>
        <Ionicons name="add" size={16} color={Colors.primary} />
        <Text style={styles.addBtnText}>Add business type</Text>
      </TouchableOpacity>
      <View style={styles.presetRow}>
        <Text style={styles.presetLabel}>Quick target:</Text>
        {TARGET_PRESETS.map(n => (
          <TouchableOpacity
            key={n}
            style={styles.presetChip}
            onPress={() => setBusinessTypes(prev => prev.map(bt => ({ ...bt, count: n })))}
          >
            <Text style={styles.presetChipText}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Options */}
      <Text style={styles.sectionTitle}>Options</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Comprehensive search (multiple strategies)</Text>
        <Switch value={comprehensive} onValueChange={setComprehensive} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Filter by rating</Text>
        <Switch value={filterRating} onValueChange={setFilterRating} />
      </View>
      {filterRating && (
        <TextInput
          style={styles.input}
          value={minRating}
          onChangeText={setMinRating}
          placeholder="Min rating (e.g. 4.0)"
          keyboardType="decimal-pad"
          placeholderTextColor={Colors.textMuted}
        />
      )}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Filter by review count</Text>
        <Switch value={filterReviews} onValueChange={setFilterReviews} />
      </View>
      {filterReviews && (
        <TextInput
          style={styles.input}
          value={minReviews}
          onChangeText={setMinReviews}
          placeholder="Min reviews (e.g. 5)"
          keyboardType="numeric"
          placeholderTextColor={Colors.textMuted}
        />
      )}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Only businesses with phone number</Text>
        <Switch value={filterPhone} onValueChange={setFilterPhone} />
      </View>

      {/* Cost estimate */}
      <View style={styles.costCard}>
        <Ionicons name="cash-outline" size={18} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.costLabel}>Estimated cost</Text>
          <Text style={styles.costValue}>~${rawEstimate.toFixed(2)}</Text>
          <Text style={styles.costHint}>Google gives $200/mo free credit.</Text>
        </View>
      </View>

      {/* Generate */}
      <TouchableOpacity
        style={[styles.generateBtn, generating && { opacity: 0.6 }]}
        onPress={generate}
        disabled={generating}
      >
        {generating ? (
          <>
            <ActivityIndicator color="#FFF" />
            <Text style={styles.generateBtnText}>  Generating... (1-3 min per combo)</Text>
          </>
        ) : (
          <>
            <Ionicons name="rocket-outline" size={20} color="#FFF" />
            <Text style={styles.generateBtnText}>Generate Leads</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Preview */}
      {combos && combos.length > 0 && (
        <>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Preview — {totalPreview} leads found</Text>
            {estimatedCost !== null && (
              <Text style={styles.previewCost}>Actual est. cost: ${estimatedCost.toFixed(2)}</Text>
            )}
          </View>

          {combos.map((combo, i) => {
            const key = `${combo.city}_${combo.business_type}_${i}`;
            const open = expanded[key];
            return (
              <View key={key} style={styles.comboCard}>
                <TouchableOpacity
                  style={styles.comboHead}
                  onPress={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.comboTitle}>{combo.business_type} in {combo.city}</Text>
                    <Text style={styles.comboMeta}>{combo.leads.length} leads</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
                {open && (
                  <View style={styles.comboBody}>
                    {combo.leads.slice(0, 30).map((lead, idx) => (
                      <View key={idx} style={styles.leadRow}>
                        <Text style={styles.leadName} numberOfLines={1}>{lead.company_name || '(no name)'}</Text>
                        <Text style={styles.leadMeta} numberOfLines={1}>
                          {lead.phone_number} {lead.rating ? `· ★ ${lead.rating}` : ''} {lead.total_reviews ? `· ${lead.total_reviews} reviews` : ''}
                        </Text>
                        {lead.address ? <Text style={styles.leadAddr} numberOfLines={1}>{lead.address}</Text> : null}
                        {lead.enriched && (
                          <View style={styles.badgeRow}>
                            {lead.website_fetch_status === 'ok' && <Text style={styles.badge}>web</Text>}
                            {!!lead.instagram_url && (
                              <Text style={styles.badge}>
                                IG{lead.instagram_followers ? ` ${lead.instagram_followers}` : ''}
                              </Text>
                            )}
                            {!!lead.linkedin_url && <Text style={styles.badge}>in</Text>}
                            {!!lead.email && <Text style={styles.badge}>email</Text>}
                            {!!lead.facebook_url && <Text style={styles.badge}>fb</Text>}
                            {!!lead.whatsapp_url && <Text style={styles.badge}>wa</Text>}
                          </View>
                        )}
                      </View>
                    ))}
                    {combo.leads.length > 30 && (
                      <Text style={styles.moreHint}>...and {combo.leads.length - 30} more</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Enrich website + socials */}
          <Text style={styles.sectionTitle}>Enrich (Optional)</Text>
          <Text style={styles.headerText}>
            Visit each lead's website to pull contact info + social links. Most Google
            leads have no website (those are skipped instantly), so only the ones with a
            site are fetched. Best-effort — some sites block access.
          </Text>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.toggleLabel}>Also fetch Instagram/LinkedIn profile stats</Text>
              <Text style={styles.costHint}>
                Much slower and often blocked from the server. Off = still get IG/LinkedIn
                links from websites, just no follower counts.
              </Text>
            </View>
            <Switch value={fetchSocial} onValueChange={setFetchSocial} disabled={enriching} />
          </View>

          {enriching && enrichProgress ? (
            <View style={styles.enrichProgressCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.enrichProgressTitle}>
                    {enrichProgress.phase === 'social' ? 'Fetching social profiles' : 'Fetching websites'}
                    {' · '}{enrichProgress.done}/{enrichProgress.total}
                  </Text>
                  <Text style={styles.costHint}>
                    {enrichProgress.chunkCount > 1 ? `Batch ${enrichProgress.chunkIdx}/${enrichProgress.chunkCount} · ` : ''}
                    {typeof enrichProgress.withWebsite === 'number' ? `${enrichProgress.withWebsite} have websites · ` : ''}
                    {enrichStartedAt ? `${fmtElapsed(Date.now() - enrichStartedAt)} elapsed` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cancelEnrichBtn}
                onPress={() => { cancelEnrichRef.current = true; }}
              >
                <Ionicons name="stop-circle-outline" size={16} color={Colors.danger} />
                <Text style={styles.cancelEnrichText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.enrichBtn, enriched && { opacity: 0.6 }]}
              onPress={enrichAll}
              disabled={enriched}
            >
              {enriched ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  <Text style={[styles.enrichBtnText, { color: Colors.success }]}>Enriched</Text>
                </>
              ) : (
                <>
                  <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                  <Text style={styles.enrichBtnText}>
                    Enrich {fetchSocial ? 'website + socials' : 'websites'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Assign */}
          <Text style={styles.sectionTitle}>Assign To (Optional)</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, !assignedTo && styles.chipActive]}
              onPress={() => setAssignedTo(null)}
            >
              <Text style={[styles.chipText, !assignedTo && styles.chipTextActive]}>Unassigned</Text>
            </TouchableOpacity>
            {salesUsers.map(u => (
              <TouchableOpacity
                key={u.id}
                style={[styles.chip, assignedTo === u.id && styles.chipActive]}
                onPress={() => setAssignedTo(u.id)}
              >
                <Text style={[styles.chipText, assignedTo === u.id && styles.chipTextActive]}>{u.full_name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Import */}
          <TouchableOpacity
            style={[styles.importBtn, importing && { opacity: 0.6 }]}
            onPress={importAll}
            disabled={importing || totalPreview === 0}
          >
            {importing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                <Text style={styles.importBtnText}>Import All {totalPreview} Leads</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60 },
  headerCard: {
    flexDirection: 'row', gap: 12, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: 16, marginBottom: 20,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  headerText: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 42, fontSize: 14, color: Colors.text,
  },
  testBtn: {
    paddingHorizontal: 14, height: 42, borderRadius: 8,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  testBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  keyStatus: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginBottom: 4,
  },
  keyOk: { backgroundColor: Colors.successBg },
  keyErr: { backgroundColor: Colors.dangerBg },
  keyStatusText: { fontSize: 12, fontWeight: '500' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: '#FFF' },
  btRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  removeBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary,
    borderStyle: 'dashed', marginBottom: 8,
  },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  presetLabel: { fontSize: 11, color: Colors.textMuted },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  presetChipText: { fontSize: 11, color: Colors.text },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toggleLabel: { fontSize: 13, color: Colors.text, flex: 1 },
  costCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: Colors.infoBg, borderRadius: 8, padding: 12, marginTop: 16, marginBottom: 12,
  },
  costLabel: { fontSize: 11, color: Colors.textMuted },
  costValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  costHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 50, borderRadius: 8, marginBottom: 20,
  },
  generateBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  previewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, marginBottom: 10,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  previewCost: { fontSize: 12, color: Colors.textMuted },
  comboCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, marginBottom: 8, overflow: 'hidden',
  },
  comboHead: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  comboTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  comboMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  comboBody: { paddingHorizontal: 12, paddingBottom: 12 },
  leadRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  leadName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  leadMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  leadAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badge: {
    fontSize: 10, fontWeight: '600', color: Colors.primary,
    backgroundColor: Colors.infoBg, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
  },
  moreHint: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', padding: 8, textAlign: 'center' },
  enrichBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary,
    height: 50, borderRadius: 8, marginTop: 8, marginBottom: 4,
  },
  enrichBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  enrichProgressCard: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 8,
    backgroundColor: Colors.surface, padding: 14, marginTop: 8, marginBottom: 4, gap: 10,
  },
  enrichProgressTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  cancelEnrichBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.danger,
  },
  cancelEnrichText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 52, borderRadius: 8, marginTop: 8,
  },
  importBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
