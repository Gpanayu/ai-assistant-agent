import React, { useState } from 'react';
import './CollabModal.css'; // We'll create this

// Default props for demonstration
const defaultProps = {
  isOpen: false,
  onClose: () => {},
  teammateRequest: 'P needs quick help with create_order',
  initialTime: 2, // Default estimated time
  maxTime: 5, // Max time for the slider
  completionPercent: 65, // Projected completion
  focusMessageTemplate: 'Verify the dictionary key-value pairs are accessed correctly within the loop and that the output is aligned as requested; consider adding error handling for missing data.',
};

function CollaborativeOpportunityModal(props) {
  // Combine default props with incoming props
  const mergedProps = { ...defaultProps, ...props };
  const {
    isOpen,
    onClose,
    teammateRequest,
    initialTime,
    maxTime,
    completionPercent,
    focusMessageTemplate
  } = mergedProps;

  // State to hold the current time value from the slider
  const [currentTime, setCurrentTime] = useState(initialTime);

  if (!isOpen) {
    return null;
  }

  const handleTimeChange = (event) => {
    setCurrentTime(event.target.value);
  };

  const handleHelp = () => {
    console.log(`Helping for ${currentTime} minutes.`);
    // Add logic for the "Help" action
    onClose(); // Close modal after action
  };

  const handleDoNotHelp = () => {
    console.log("Chose not to help.");
    // Add logic for the "Do Not Help" action
    onClose(); // Close modal after action
  };

  // Construct the dynamic focus message
  const focusMessage = `If you want to spend ${currentTime} minute(s) helping, focus on this: ${focusMessageTemplate}`;


  return (
    <div className="collab-modal-overlay" onClick={onClose}>
      <div className="collab-modal-content" onClick={(e) => e.stopPropagation()}>
        <h1>Collaborative Opportunity!</h1>

        <div className="collab-modal-section">
          <h3 className="collab-section-title">Help Teammate</h3>
          <p className="collab-request-text">{teammateRequest}</p>
        </div>

        <div className="collab-modal-section">
          <h3 className="collab-section-title">Estimated Time Allocation</h3>
          <div className="collab-slider-container">
            <input
              type="range"
              min="1"
              max={maxTime}
              value={currentTime}
              onChange={handleTimeChange}
              className="collab-time-slider"
            />
            <div className="collab-slider-labels">
              <span>1 min</span>
              {[...Array(maxTime - 1)].map((_, i) => (
                 // Display intermediate labels if needed, or just min/max
                 // For simplicity, just showing the current value marker
                 i + 2 === parseInt(currentTime) ?
                 <span key={i} className="collab-current-time-marker" style={{left: `${( (i + 1) / (maxTime - 1)) * 100}%`}}>{currentTime}</span>
                 : null
              ))}
               <span style={{ textAlign: 'right' }}>{maxTime} min</span>
            </div>
             {/* Separate display for the current time */}
             <div className="collab-current-time-display">{currentTime}</div>
          </div>
        </div>

        <div className="collab-modal-section">
          <h3 className="collab-section-title">Projected Completion Percent</h3>
          <p className="collab-completion-subtitle">How much of the project you will complete in remaining time</p>
          <div className="collab-completion-chart">
            <div className="collab-completion-bar-container">
              <div className="collab-completion-bar" style={{ width: `${completionPercent}%` }}>
                {completionPercent}%
              </div>
            </div>
            <div className="collab-completion-axis">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
            </div>
            <div className="collab-completion-legend">
              <span className="collab-legend-item prediction"></span> prediction
              <span className="collab-legend-item completed"></span> completed
            </div>
          </div>
        </div>

        <div className="collab-modal-section collab-focus-section">
          <p>{focusMessage}</p>
        </div>

        <div className="collab-modal-footer">
          <button className="collab-button collab-button-help" onClick={handleHelp}>
            Move Over (Physically) and Help
          </button>
          <button className="collab-button collab-button-nohelp" onClick={handleDoNotHelp}>
            Do Not Help
          </button>
        </div>
      </div>
    </div>
  );
}

// You can still export with default props if you like
// CollaborativeOpportunityModal.defaultProps = defaultProps;

export default CollaborativeOpportunityModal;