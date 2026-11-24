import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  minDate?: DateOption;
  maxDate?: DateOption;
  label?: string;
  placeholder?: string;
  showDropdowns?: boolean;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  minDate,
  maxDate,
  placeholder,
  showDropdowns = true, // Default to true for better UX
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);

  // Sync onChange without re-running flatpickr init
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync defaultDate without re-running flatpickr init
  useEffect(() => {
    if (fpRef.current && defaultDate !== undefined) {
      fpRef.current.setDate(defaultDate, false);
    }
  }, [defaultDate]);

  // Sync min/max
  useEffect(() => {
    if (fpRef.current) {
      if (minDate !== undefined) fpRef.current.set("minDate", minDate);
      if (maxDate !== undefined) fpRef.current.set("maxDate", maxDate);
    }
  }, [minDate, maxDate]);

  useEffect(() => {
    if (!inputRef.current) return;
    
    const flatPickr = flatpickr(inputRef.current, {
      mode: mode || "single",
      monthSelectorType: showDropdowns ? "dropdown" : "static",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d-m-Y",
      disableMobile: true, // Forces flatpickr modal on mobile, avoids duplicate native inputs
      defaultDate,
      minDate,
      maxDate,
      allowInput: true,
      onChange: (selectedDates, dateStr, instance) => {
        if (onChangeRef.current) {
          if (Array.isArray(onChangeRef.current)) {
            onChangeRef.current.forEach(fn => fn(selectedDates, dateStr, instance));
          } else {
            onChangeRef.current(selectedDates, dateStr, instance);
          }
        }
      },
      onReady: function (_, __, instance) {
        const calendarContainer = instance.calendarContainer;
        const yearInput = calendarContainer.querySelector(".numInput.cur-year") as HTMLInputElement;
        if (yearInput) {
          // Create year dropdown
          const yearSelect = document.createElement("select");
          yearSelect.className = "flatpickr-monthDropdown-months hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer !appearance-auto !w-auto !inline-block !border-none !outline-none !p-1 !rounded-md ml-1";
          yearSelect.style.fontWeight = "bold";

          const currentYear = new Date().getFullYear();
          const startYear = currentYear - 100; // 100 years back
          const endYear = currentYear + 10;   // 10 years forward

          for (let y = endYear; y >= startYear; y--) {
            const option = document.createElement("option");
            option.value = y.toString();
            option.text = y.toString();
            yearSelect.appendChild(option);
          }

          yearSelect.value = instance.currentYear.toString();

          yearSelect.addEventListener("change", (e: any) => {
            instance.changeYear(parseInt(e.target.value));
          });

          // Hide original year input and insert select
          yearInput.style.display = "none";
          yearInput.parentNode?.insertBefore(yearSelect, yearInput.nextSibling);

          // Update select when flatpickr changes year (e.g. through arrows)
          instance.set("onYearChange", () => {
             yearSelect.value = instance.currentYear.toString();
          });
        }
      },
      prevArrow: '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="M5.4 10.8l1.4-1.4-4-4 4-4L5.4 0 0 5.4z" /></svg>',
      nextArrow: '<svg class="fill-current" width="7" height="11" viewBox="0 0 7 11"><path d="M1.4 10.8L0 9.4l4-4-4-4L1.4 0l5.4 5.4z" /></svg>',
    });

    // Make sure we store it as a single instance because we pass an element natively.
    fpRef.current = Array.isArray(flatPickr) ? flatPickr[0] : flatPickr;

    return () => {
      if (fpRef.current) {
        fpRef.current.destroy();
        fpRef.current = null;
      }
    };
  }, [mode, id, showDropdowns]); // removed minDate, maxDate, defaultDate, onChange to prevent re-instantiation

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border appearance-none px-4 pr-10 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-white/90 border-gray-300 dark:border-gray-700 focus:border-brand-300 focus:ring-brand-500/20 dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-500">
          <CalenderIcon className="size-5" />
        </span>
      </div>
      
      {/* 
        Hack to prevent React from making the original input visible again when it reverts type="hidden" to type="text". 
        The altInput does not copy the 'id' attribute, so this cleanly targets only the original raw input! 
      */}
      <style>{`
        input#${id}.flatpickr-input {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
