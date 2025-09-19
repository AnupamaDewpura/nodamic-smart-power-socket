// src/components/CustomTimePicker.jsx
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const CustomTimePicker = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState("00");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  // Parse the current value (HH:MM format)
  useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [hour, minute] = value.split(":");
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
  }, [value]);

  // Calculate dropdown position
  const calculateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        top: rect.bottom + scrollTop + 4,
        left: rect.left + scrollLeft - 20,
      });
    }
  };

  // Scroll to selected items when dropdown opens
  useEffect(() => {
    if (isOpen && hourListRef.current && minuteListRef.current) {
      const hourIndex = parseInt(selectedHour, 10);
      const minuteIndex = parseInt(selectedMinute, 10) / 15;

      const hourElement = hourListRef.current.children[hourIndex];
      if (hourElement) {
        hourElement.scrollIntoView({ block: "center", behavior: "smooth" });
      }

      const minuteElement = minuteListRef.current.children[minuteIndex];
      if (minuteElement) {
        minuteElement.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [isOpen, selectedHour, selectedMinute]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        const dropdown = document.querySelector(".time-picker-dropdown");
        if (dropdown && !dropdown.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleDisplayClick = () => {
    if (!isOpen) {
      calculateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleHourSelect = (hour) => {
    setSelectedHour(hour);
    const newTime = `${hour}:${selectedMinute}`;
    onChange(newTime);
  };

  const handleMinuteSelect = (minute) => {
    setSelectedMinute(minute);
    const newTime = `${selectedHour}:${minute}`;
    onChange(newTime);
  };

  // Generate hour options (00-23)
  const hourOptions = [];
  for (let i = 0; i < 24; i++) {
    hourOptions.push(String(i).padStart(2, "0"));
  }

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = [];
  for (let i = 0; i < 60; i += 5) {
    minuteOptions.push(String(i).padStart(2, "0"));
  }

  const dropdownContent = isOpen ? (
    <div
      className="time-picker-dropdown"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      <div className="time-picker-content">
        <div className="time-picker-column">
          <div className="time-picker-label">Hour</div>
          <div className="time-picker-list" ref={hourListRef}>
            {hourOptions.map((hour) => (
              <button
                key={hour}
                className={`time-picker-item ${
                  hour === selectedHour ? "selected" : ""
                }`}
                onClick={() => handleHourSelect(hour)}
              >
                {hour}
              </button>
            ))}
          </div>
        </div>

        <div className="time-picker-column">
          <div className="time-picker-label">Min</div>
          <div className="time-picker-list" ref={minuteListRef}>
            {minuteOptions.map((minute) => (
              <button
                key={minute}
                className={`time-picker-item ${
                  minute === selectedMinute ? "selected" : ""
                }`}
                onClick={() => handleMinuteSelect(minute)}
              >
                {minute}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={`custom-time-picker ${className}`} ref={containerRef}>
        <div
          className={`time-picker-display ${isOpen ? "open" : ""}`}
          onClick={handleDisplayClick}
        >
          {value || "00:00"}
        </div>
      </div>

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default CustomTimePicker;
