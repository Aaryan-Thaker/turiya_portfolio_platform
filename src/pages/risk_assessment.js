// pages/risk-assessment.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Nav from '../components/Nav';

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

export default function RiskAssessment({ currentUser }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    // Client Information
    applicantName: '',
    applicantAddress: '',
    // Investment Experience
    ...INVESTMENT_TYPES.reduce((acc, type) => {
      const key = `${type.toLowerCase().replace(' ', '')}Experience`;
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

  // Calculate score whenever answers change
  useEffect(() => {
    calculateScore();
  }, [formData]);

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
    
    // Continue for all 8 questions...
    // (Add scoring logic for remaining questions here)
    
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.applicantName || !formData.applicantAddress || !formData.applicantSignature) {
      setError('Please complete all required fields including signatures');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/risk/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalScore,
          riskProfile
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Mark as completed in localStorage
      localStorage.setItem('riskAssessmentCompleted', 'true');
      router.push('/portfolio');
    } catch (err) {
      setError(err.message || 'Network error during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
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
    setFormData(prev => ({
      ...prev,
      [field]: null
    }));
  };

  return (
    <div className="risk-assessment-container">
      <Nav user={currentUser} />
      
      <h1>Client Risk Profiling and Investment Suitability</h1>
      <p className="disclaimer">
        We request you to complete this Client Profile Form entirely and accurately. 
        It will be used by your adviser to ensure that the advice we provide is 
        tailored to your specific needs and objectives.
      </p>

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
                        name={`${type.toLowerCase().replace(' ', '')}Experience`}
                        value={level}
                        checked={formData[`${type.toLowerCase().replace(' ', '')}Experience`] === level}
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
            <h3>1) Which of the following best describes your purpose for investing? <span className="required">*</span></h3>
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
            <h3>2) Which best describes your current life stage? <span className="required">*</span></h3>
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
          
          {/* Continue with similar structure for Questions 3-8 */}
          {/* ... */}
          
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
            <h3>Applicant Signature <span className="required">*</span></h3>
            <SignaturePad 
              options={{ penColor: '#000' }}
              onEnd={(sig) => setFormData({...formData, applicantSignature: sig.toDataURL()})}
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
              options={{ penColor: '#000' }}
              onEnd={(sig) => setFormData({...formData, advisorSignature: sig.toDataURL()})}
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

export async function getServerSideProps(context) {
  // Your existing auth logic
  return {
    props: {
      currentUser: { /* user data */ }
    }
  };
}