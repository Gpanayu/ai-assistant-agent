import React, { useState } from 'react';
import './HelpModal.css'; // We'll create this CSS file next

function HelpModal({ isOpen, onClose }) {
  const [selectedOption, setSelectedOption] = useState(null);

  if (!isOpen) {
    return null; // Don't render the modal if it's not open
  }

  const handleOptionClick = (option) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    console.log("Selected option:", selectedOption);
    // Add logic here to handle the submission based on selectedOption
    onClose(); // Close the modal after submission (optional)
  };

  return (
    <div className="modal-overlay" onClick={onClose}> {/* Close on overlay click */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Prevent closing when clicking inside */}
        <h2>Looks like you are stuck! Would you like to ask for help?</h2>

        <div className="modal-body">
          <div className="suggestions-column">
            <p className="suggestions-label">Suggestions</p>
            <button
              className={`suggestion-option ${selectedOption === 'hint' ? 'selected' : ''}`}
              onClick={() => handleOptionClick('hint')}
            >
              Want to request a Quick hint help from a teammate?💡
            </button>
            <button
              className={`suggestion-option ${selectedOption === 'full' ? 'selected' : ''}`}
              onClick={() => handleOptionClick('full')}
            >
              Want to request a full help from a teammate?🆘
            </button>
            <button
              className={`suggestion-option ${selectedOption === 'none' ? 'selected' : ''}`}
              onClick={() => handleOptionClick('none')}
            >
              Don't want to request help?
            </button>
          </div>

          <div className="graphs-column">
            {/* Placeholder for End Goal Completion % */}
            <div className="graph-placeholder">
                <p>End Goal Completion %</p>
                {/* Simple bar representation */}
                <div className="progress-bar-container">
                    <div className="progress-bar-completed" style={{ width: '15%' }}></div> {/* Example: 15% completed */}
                    <div className="progress-bar-prediction" style={{ width: '65%' }}></div> {/* Example: 65% predicted */}
                    <span className="progress-label">80%</span>
                </div>
                <div className="legend">
                   <span className="legend-item completed"></span> completed
                   <span className="legend-item prediction"></span> prediction
                </div>
            </div>

             {/* Placeholder for Progress Contributions */}
            <div className="graph-placeholder">
                <p>Progress Contributions in %</p>
                 {/* You would integrate a charting library here for a real graph */}
                <div className="chart-area">
                   <p style={{textAlign: 'center', color: '#aaa'}}>Graph Placeholder</p>
                </div>
                <div className="legend feline-dog">
                    <span className="legend-item feline"></span> FelineDog
                </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="submit-button" onClick={handleSubmit} disabled={!selectedOption}>
            Submit
          </button>
          {/* Optional: Add a close button */}
          {/* <button className="close-button" onClick={onClose}>Close</button> */}
        </div>
      </div>
    </div>
  );
}

export default HelpModal;