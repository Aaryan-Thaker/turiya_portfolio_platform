// pages/risk-assessment.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Nav from './Nav';
import { getSession, useSession, signIn } from 'next-auth/react';

// Dynamic imports for signature pads
const SignaturePad = dynamic(
  () => import('react-signature-pad-wrapper'),
  { ssr: false }
);

const RISK_PROFILES = {
  DEFENSIVE: { min: 0, max: 120, label: 'Defensive' },
  MODERATE: { min: 130, max: 250, label: 'Moderate' },
  AGGRESSIVE: { min: 260, max: 350, label: 'Aggressive' },
  VERY_AGGRESSIVE: { min: 360, max: 400, label: 'Very Aggressive' }
};

const INVESTMENT_TYPES = [
  'Equity', 'Fixed Income', 'Property', 'Alternate Investments',
  'Overseas Investments', 'Currencies', 'Commodities', 'Passion Investments'
];

const INTERESTED_INVESTMENTS = [
  'Equity', 'Money Market Funds', 'Fixed Income', 'Property',
  'Alternate Investment', 'International Funds', 'Currencies',
  'Commodities', 'Passion Investment'
];

const PURPOSE_OPTIONS = [
  { value: 'a', label: 'Investing for growth, and to accumulate long term wealth, with a horizon of 5 years or more' },
  { value: 'b', label: 'You have surplus funds to invest and aim to accumulate long term wealth from a balanced portfolio' },
  { value: 'c', label: 'You have a lumpsum (eg an inheritance) and you want to invest in secured investment alternatives' },
  { value: 'd', label: 'To create sufficient funds for retirement' },
  { value: 'e', label: 'Accumulate sufficient funds for a specific objective within the next 5 years' }
];

const LIFE_STAGE_OPTIONS = [
  { value: 'a', label: 'Early career (under 30)' },
  { value: 'b', label: 'Career building (30-45)' },
  { value: 'c', label: 'Peak earning years (45-60)' },
  { value: 'd', label: 'Pre-retirement (60-65)' },
  { value: 'e', label: 'Retired (65+)' },
  { value: 'f', label: 'Other' }
];

export default function RiskAssessment({ currentUser, errorMessage }) {
  const router = useRouter();
  const applicantSigRef = useRef(null);
  const advisorSigRef = useRef(null);

  // useSession for reactive client-side auth state
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState({
    // Client Information
    applicantName: '',
    applicantAddress: '',
    // Investment Experience (dynamically added keys)
    ...INVESTMENT_TYPES.reduce((acc, type) => {
      // replace all spaces for the key
      const key = `${type.toLowerCase().replace(/\s+/g, '')}Experience`;
      return { ...acc, [key]: '' };
    }, {}),
    // Investment Goals
    capitalGrowthPriority: '',
    capitalSecurityPriority: '',
    balancedPriority: '',
    interestedInvestments: [],
    // Risk Profile Questions
    purposeOfInvesting: '',
    lifeStage: '',
    expectedReturns: '',
    derivativeProducts: '',
    investmentHorizon: '',
    marketDownturnReaction: '',
    incomeStability: '',
    emergencySavings: '',
    // Signatures
    applicantSignature: null,
    advisorSignature: null,
    // Office Use
    advisorName: '',
    advisorDesignation: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    assessmentPlace: ''
  });

  const [totalScore, setTotalScore] = useState(0);
  const [riskProfile, setRiskProfile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingAssessment, setExistingAssessment] = useState(null);
  const [checkingAssessment, setCheckingAssessment] = useState(true);

  // Calculate score whenever answers change
  useEffect(() => {
    calculateScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Fetch existing risk assessment ONCE when authenticated
  useEffect(() => {
    async function loadAssessment() {
      // If not authenticated, skip calling protected endpoint
      if (status !== 'authenticated') {
        setCheckingAssessment(false);
        return;
      }

      try {
        // Prefer reactive session token, else fallback to getSession()
        const s = session || (await getSession());
        const token = s?.accessToken;
        if (!token) {
          setCheckingAssessment(false);
          return;
        }

        const res = await fetch('/api/risk/check', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          // unauthorized — nothing to show
          setCheckingAssessment(false);
          return;
        }

        const json = await res.json().catch(() => null);
        if (json && json.success && json.completed) {
          setExistingAssessment(json.latest_assessment || null);
        }
      } catch (err) {
        // non-fatal; we show UI anyway
        console.warn('Could not load existing assessment:', err);
      } finally {
        setCheckingAssessment(false);
      }
    }

    loadAssessment();
    // run when status (auth) changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const calculateScore = () => {
    let score = 0;

    // Question 1: Purpose of Investing
    const purposeScores = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    if (formData.purposeOfInvesting in purposeScores) {
      score += purposeScores[formData.purposeOfInvesting];
    }

    // Question 2: Life Stage
    const lifeStageScores = { a: 50, b: 40, c: 30, d: 50, e: 20, f: 10 };
    if (formData.lifeStage in lifeStageScores) {
      score += lifeStageScores[formData.lifeStage];
    }

    // Question 3: Expected Returns
    const returnsScores = { a: 10, b: 20, c: 30, d: 40, e: 50 };
    if (formData.expectedReturns in returnsScores) {
      score += returnsScores[formData.expectedReturns];
    }

    // Question 4: Derivative Products
    const derivativesScores = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    if (formData.derivativeProducts in derivativesScores) {
      score += derivativesScores[formData.derivativeProducts];
    }

    // Question 5: Investment Horizon
    const horizonScores = { a: 10, b: 20, c: 30, d: 40, e: 50 };
    if (formData.investmentHorizon in horizonScores) {
      score += horizonScores[formData.investmentHorizon];
    }

    // Question 6: Market Downturn Reaction
    const downturnScores = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    if (formData.marketDownturnReaction in downturnScores) {
      score += downturnScores[formData.marketDownturnReaction];
    }

    // Question 7: Income Stability
    const incomeScores = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    if (formData.incomeStability in incomeScores) {
      score += incomeScores[formData.incomeStability];
    }

    // Question 8: Emergency Savings
    const savingsScores = { a: 50, b: 40, c: 30, d: 20, e: 10 };
    if (formData.emergencySavings in savingsScores) {
      score += savingsScores[formData.emergencySavings];
    }

    setTotalScore(score);
    determineRiskProfile(score);
  };

  const determineRiskProfile = (score) => {
    for (const [key, range] of Object.entries(RISK_PROFILES)) {
      if (score >= range.min && score <= range.max) {
        setRiskProfile(range.label);
        return;
      }
    }
    setRiskProfile('Undetermined');
  };

  const handleApplicantSigEnd = () => {
    try {
      const ref = applicantSigRef.current;
      let dataUrl = null;
      if (!ref) return;
      if (typeof ref.toDataURL === 'function') dataUrl = ref.toDataURL();
      else if (ref.getTrimmedCanvas) dataUrl = ref.getTrimmedCanvas().toDataURL();
      else if (ref.getCanvas) dataUrl = ref.getCanvas().toDataURL();

      setFormData(prev => ({ ...prev, applicantSignature: dataUrl }));
    } catch (e) {
      // ignore silently
    }
  };

  const handleAdvisorSigEnd = () => {
    try {
      const ref = advisorSigRef.current;
      let dataUrl = null;
      if (!ref) return;
      if (typeof ref.toDataURL === 'function') dataUrl = ref.toDataURL();
      else if (ref.getTrimmedCanvas) dataUrl = ref.getTrimmedCanvas().toDataURL();
      else if (ref.getCanvas) dataUrl = ref.getCanvas().toDataURL();

      setFormData(prev => ({ ...prev, advisorSignature: dataUrl }));
    } catch (e) {
      // ignore silently
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.applicantName || !formData.applicantAddress) {
      setError('Please complete all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Prefer reactive session from useSession()
      const s = session || (await getSession());
      if (!s) {
        // Prompt sign in (NextAuth) — uses Google provider
        await signIn('google', { callbackUrl: window.location.href });
        return;
      }

      const token = s?.accessToken;
      if (!token) {
        // If session exists but no backend JWT, force re-auth
        await signIn('google', { callbackUrl: window.location.href });
        return;
      }

      // Use proxied API path so next.config rewrites or API route can forward
      const apiPath = '/api/risk/submit';

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          totalScore,
          riskProfile
        })
      });

      // Parse defensively
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { json = null; }

      if (!response.ok) {
        const errorData = json || {};
        throw new Error(errorData.error || errorData.message || `Submission failed (${response.status})`);
      }

      // success
      try { localStorage.setItem('riskAssessmentCompleted', 'true'); } catch (e) {}
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'interestedInvestments') {
      setFormData(prev => ({
        ...prev,
        interestedInvestments: checked
          ? [...prev.interestedInvestments, value]
          : prev.interestedInvestments.filter(item => item !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const clearSignature = (field) => {
    try {
      if (field === 'applicantSignature' && applicantSigRef.current) {
        if (typeof applicantSigRef.current.clear === 'function') applicantSigRef.current.clear();
        else if (applicantSigRef.current.getCanvas) {
          const c = applicantSigRef.current.getCanvas();
          const ctx = c.getContext && c.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, c.width, c.height);
        }
      } else if (field === 'advisorSignature' && advisorSigRef.current) {
        if (typeof advisorSigRef.current.clear === 'function') advisorSigRef.current.clear();
        else if (advisorSigRef.current.getCanvas) {
          const c = advisorSigRef.current.getCanvas();
          const ctx = c.getContext && c.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, c.width, c.height);
        }
      }
    } catch (e) {
      // ignore
    }

    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
  };

  if (errorMessage) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  // ensure Nav receives normalized currentUser
  const normalizedCurrentUser = {
    ...currentUser,
    isAuthenticated: currentUser?.is_authenticated ?? currentUser?.isAuthenticated ?? false,
  };

  return (
    <div className="risk-assessment-container">
      <Nav user={normalizedCurrentUser} />
      
      <h1>Client Risk Profiling and Investment Suitability</h1>
      <p className="disclaimer">
        We request you to complete this Client Profile Form entirely and accurately. 
        It will be used by your adviser to ensure that the advice we provide is 
        tailored to your specific needs and objectives.
      </p>

      {checkingAssessment ? (
        <p>Checking previous assessment...</p>
      ) : existingAssessment ? (
        <div className="form-section">
          <h3>You already completed a risk assessment</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(existingAssessment, null, 2)}</pre>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        {/* Client Information Section */}
        <section className="form-section">
          <h2>Client Information</h2>
          <div className="form-group">
            <label>Applicant Name: <span className="required">*</span></label>
            <input
              type="text"
              name="applicantName"
              value={formData.applicantName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Applicant Address: <span className="required">*</span></label>
            <textarea
              name="applicantAddress"
              value={formData.applicantAddress}
              onChange={handleInputChange}
              required
            />
          </div>
        </section>

        {/* Investment Experience Section */}
        <section className="form-section">
          <h2>Investment Experience</h2>
          <p>Please indicate your experience level for each investment type:</p>
          
          <table className="experience-table">
            <thead>
              <tr>
                <th>Investment Type</th>
                <th>Extensive</th>
                <th>Moderate</th>
                <th>Limited</th>
                <th>None</th>
              </tr>
            </thead>
            <tbody>
              {INVESTMENT_TYPES.map((type) => (
                <tr key={type}>
                  <td>{type}</td>
                  {['Extensive', 'Moderate', 'Limited', 'None'].map((level) => (
                    <td key={level}>
                      <input
                        type="radio"
                        name={`${type.toLowerCase().replace(/\s+/g, '')}Experience`}
                        value={level}
                        checked={formData[`${type.toLowerCase().replace(/\s+/g, '')}Experience`] === level}
                        onChange={handleInputChange}
                        required
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Investment Goals Section */}
        <section className="form-section">
          <h2>Investment Goals</h2>
          
          <div className="form-group">
            <h3>Objective (Please rank in order of priority, from 1-3, 1 as the top priority)</h3>
            <div className="priority-group">
              <label>
                <span>Capital Growth: <span className="required">*</span></span>
                <select
                  name="capitalGrowthPriority"
                  value={formData.capitalGrowthPriority}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
              
              <label>
                <span>Capital Security/Capital Preservation: <span className="required">*</span></span>
                <select
                  name="capitalSecurityPriority"
                  value={formData.capitalSecurityPriority}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
              
              <label>
                <span>Balanced - Preservation & Growth: <span className="required">*</span></span>
                <select
                  name="balancedPriority"
                  value={formData.balancedPriority}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
            </div>
          </div>
          
          <div className="form-group">
            <h3>Please Indicate Investments That Interest You</h3>
            <div className="checkbox-group">
              {INTERESTED_INVESTMENTS.map((investment) => (
                <label key={investment}>
                  <input
                    type="checkbox"
                    name="interestedInvestments"
                    value={investment}
                    checked={formData.interestedInvestments.includes(investment)}
                    onChange={handleInputChange}
                  />
                  {investment}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Risk Profile Questions Section */}
        <section className="form-section">
          <h2>Investor Risk Profile (Risk Appetite / Tolerance)</h2>
          
          {/* Question 1 */}
          <div className="question-group">
            <h3>1. Which of the following best describes your purpose for investing? <span className="required">*</span></h3>
            <div className="options-group">
              {PURPOSE_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="purposeOfInvesting"
                    value={option.value}
                    checked={formData.purposeOfInvesting === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          
          {/* Question 2 */}
          <div className="question-group">
            <h3>2. Which best describes your current life stage? <span className="required">*</span></h3>
            <div className="options-group">
              {LIFE_STAGE_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="lifeStage"
                    value={option.value}
                    checked={formData.lifeStage === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          
          {/* Question 3 - Expected Returns */}
          <div className="question-group">
            <h3>3. What returns do you expect from investments? <span className="required">*</span></h3>
            <div className="options-group">
              {[
                { value: 'a', label: 'Current inflation rate' },
                { value: 'b', label: 'Inflation + 2-4%' },
                { value: 'c', label: 'Inflation + 5-7%' },
                { value: 'd', label: 'Inflation + 8-12%' },
                { value: 'e', label: 'Greater than inflation + 12%' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="expectedReturns"
                    value={option.value}
                    checked={formData.expectedReturns === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Question 4 - Derivative Products */}
          <div className="question-group">
            <h3>4. Would you consider using derivative products? <span className="required">*</span></h3>
            <div className="options-group">
              {[ 
                { value: 'a', label: 'Yes, understand and trade for profit' },
                { value: 'b', label: 'Yes, as defensive strategy and income' },
                { value: 'c', label: 'Yes, as defensive strategy only' },
                { value: 'd', label: 'Not familiar, would learn first' },
                { value: 'e', label: 'No, too risky' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="derivativeProducts"
                    value={option.value}
                    checked={formData.derivativeProducts === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Question 5 - Investment Horizon */}
          <div className="question-group">
            <h3>5. How long would you expect to invest before redeeming? <span className="required">*</span></h3>
            <div className="options-group">
              {[
                { value: 'a', label: 'Less than 1 year' },
                { value: 'b', label: '1-3 years' },
                { value: 'c', label: '3-5 years' },
                { value: 'd', label: '5-7 years' },
                { value: 'e', label: 'Longer than 7 years' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="investmentHorizon"
                    value={option.value}
                    checked={formData.investmentHorizon === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Question 6 - Market Downturn Reaction */}
          <div className="question-group">
            <h3>6. If your portfolio decreased by 20%, you would: <span className="required">*</span></h3>
            <div className="options-group">
              {[
                { value: 'a', label: 'Invest more expecting growth' },
                { value: 'b', label: 'Leave investments expecting improvement' },
                { value: 'c', label: 'Wait to see if improves' },
                { value: 'd', label: 'Cut losses, move to defensive assets' },
                { value: 'e', label: 'Sell all investments' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="marketDownturnReaction"
                    value={option.value}
                    checked={formData.marketDownturnReaction === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Question 7 - Income Stability */}
          <div className="question-group">
            <h3>7. How stable is your current and future income? <span className="required">*</span></h3>
            <div className="options-group">
              {[
                { value: 'a', label: 'Very stable' },
                { value: 'b', label: 'Stable' },
                { value: 'c', label: 'Somewhat stable' },
                { value: 'd', label: 'Unstable' },
                { value: 'e', label: 'Very unstable' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="incomeStability"
                    value={option.value}
                    checked={formData.incomeStability === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Question 8 - Emergency Savings */}
          <div className="question-group">
            <h3>8. Do you have separate savings for major expenses? <span className="required">*</span></h3>
            <div className="options-group">
              {[
                { value: 'a', label: 'No upcoming expenses except retirement' },
                { value: 'b', label: 'Yes, separate savings' },
                { value: 'c', label: 'Small savings for partial expenses' },
                { value: 'd', label: 'No savings, use credit card' },
                { value: 'e', label: 'No separate savings' }
              ].map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="emergencySavings"
                    value={option.value}
                    checked={formData.emergencySavings === option.value}
                    onChange={handleInputChange}
                    required
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          
          {/* Score Display */}
          <div className="score-display">
            <h3>Total Investor Profile Score: {totalScore}</h3>
            <h3>Your risk profile based on above assessment: {riskProfile}</h3>
          </div>
        </section>

        {/* Signatures Section */}
        <section className="form-section">
          <h2>Signatures</h2>
          
          <div className="signature-group">
            <h3>Applicant Signature <span>*</span></h3>
            <SignaturePad 
              ref={applicantSigRef}
              options={{ penColor: '#000' }}
              onEnd={handleApplicantSigEnd}
              redrawOnResize={true}
            />
            <button 
              type="button" 
              onClick={() => clearSignature('applicantSignature')}
              className="clear-signature"
            >
              Clear Signature
            </button>
          </div>
          
          <div className="signature-group">
            <h3>Investment Advisor Signature</h3>
            <SignaturePad 
              ref={advisorSigRef}
              options={{ penColor: '#000' }}
              onEnd={handleAdvisorSigEnd}
              redrawOnResize={true}
            />
            <button 
              type="button" 
              onClick={() => clearSignature('advisorSignature')}
              className="clear-signature"
            >
              Clear Signature
            </button>
          </div>
        </section>

        {/* Office Use Section */}
        <section className="form-section">
          <h2>For Office Use Only</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Name of the Investment Advisor:</label>
              <input
                type="text"
                name="advisorName"
                value={formData.advisorName}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label>Designation:</label>
              <input
                type="text"
                name="advisorDesignation"
                value={formData.advisorDesignation}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                name="assessmentDate"
                value={formData.assessmentDate}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label>Place:</label>
              <input
                type="text"
                name="assessmentPlace"
                value={formData.assessmentPlace}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </section>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={isSubmitting} className="submit-button">
          {isSubmitting ? 'Submitting...' : 'Submit Risk Assessment'}
        </button>
      </form>

      <style jsx>{`
        .risk-assessment-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        .disclaimer {
          font-style: italic;
          margin-bottom: 30px;
          color: #555;
        }
        
        .form-section {
          margin-bottom: 40px;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .required {
          color: #f5222d;
        }
        
        input[type="text"],
        input[type="date"],
        textarea,
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        textarea {
          min-height: 80px;
        }
        
        .experience-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        .experience-table th,
        .experience-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        
        .experience-table th {
          background-color: #f2f2f2;
        }
        
        .priority-group {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        
        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .question-group {
          margin-bottom: 30px;
        }
        
        .options-group {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        
        .options-group label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-weight: normal;
        }
        
        .score-display {
          padding: 15px;
          background-color: #e6f7ff;
          border-left: 4px solid #1890ff;
          margin: 20px 0;
        }
        
        .signature-group {
          margin-bottom: 20px;
        }
        
        .clear-signature {
          margin-top: 10px;
          padding: 5px 10px;
          background-color: #f5f5f5;
          border: 1px solid #d9d9d9;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .error-message {
          color: #f5222d;
          margin: 20px 0;
          padding: 10px;
          background-color: #fff1f0;
          border: 1px solid #ffa39e;
        }
        
        .submit-button {
          padding: 10px 20px;
          background-color: #1890ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        
        .submit-button:disabled {
          background-color: #d9d9d9;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

/* Server-side props (unchanged) */

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const token = session?.accessToken || "";

  if (!token) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  // Use the relative API route — your next.config.mjs rewrites should forward this to Flask
  const backendUrl = "/api/risk/check";

  let existingAssessment = null;
  try {
    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return {
    props: {
      currentUser: null,   // show loading UI on client
    }
  };
    }

    const data = await res.json().catch(() => ({}));
    if (data?.completed && data?.latest_assessment) {
      existingAssessment = data.latest_assessment;
    }
  } catch (err) {
    console.error("Error checking risk assessment:", err);
    // don't block: just show empty form client-side
  }

  return {
    props: {
      existingAssessment,
    },
  };
}
