import { useState, useEffect, useMemo } from "react";
import { AuthInput, AuthSelect } from "@/shared/components/ui/auth-fuse";
import { INDIAN_STATES } from "@/features/onboarding/constants";
import type { StepPropsExtra } from "./types";
import { Loader2 } from "lucide-react";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { onboardingApi } from "@/features/onboarding/api/onboarding";

interface PostOffice {
  Name: string;
  District: string;
  Block: string;
  State: string;
}

const pincodeCache: Record<string, PostOffice[]> = {};

export function ContactStep({
  register,
  errors,
  watch,
  setValue,
}: StepPropsExtra) {
  const pinCode = watch("pin_code");
  const selectedArea = watch("area");

  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState("");

  // Memoised area options — only recomputed when postOffices reference changes
  const areaOptions = useMemo(
    () =>
      postOffices.map((po) => ({
        label: po.Name,
        value: po.Name,
        sublabel: `${po.District}, ${po.State}`,
      })),
    [postOffices],
  );

  // Keep the schema's conditional-requirement flag in sync: the area / post
  // office selection is only mandatory when we actually have options to offer.
  // A pincode-API outage must never block the application — the applicant
  // falls back to typing city/state manually.
  useEffect(() => {
    setValue("area_required", postOffices.length > 0 ? "yes" : "", {
      shouldValidate: false,
    });
    // Drop a stale selection that no longer matches the loaded options (e.g.
    // the pin code was replaced via paste, or a draft was restored).
    if (
      selectedArea &&
      postOffices.length > 0 &&
      !postOffices.some((po) => po.Name === selectedArea)
    ) {
      setValue("area", "", { shouldValidate: false });
    }
    // selectedArea intentionally excluded — sync only when the option list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postOffices, setValue]);

  useEffect(() => {
    if (!pinCode || pinCode.length !== 6) {
      setPostOffices([]);
      setPincodeError("");
      // Clear selected area when the pin code becomes invalid
      if (selectedArea) setValue("area", "", { shouldValidate: true });
      return;
    }

    if (pincodeCache[pinCode]) {
      setPostOffices(pincodeCache[pinCode]);
      setPincodeError("");
      return;
    }

    const fetchPincode = async () => {
      setLoadingPincode(true);
      setPincodeError("");
      try {
        const data = await onboardingApi.getPincode(pinCode);
        if (data && data[0] && data[0].Status === "Success") {
          const offices: PostOffice[] = data[0].PostOffice || [];
          pincodeCache[pinCode] = offices;
          setPostOffices(offices);
        } else {
          setPostOffices([]);
          setPincodeError("Invalid PIN Code or no data found");
          if (selectedArea) setValue("area", "", { shouldValidate: true });
        }
      } catch {
        setPostOffices([]);
        setPincodeError(
          "Couldn't look up this PIN code right now — enter your city and state manually below.",
        );
        if (selectedArea) setValue("area", "", { shouldValidate: false });
      } finally {
        setLoadingPincode(false);
      }
    };

    const timer = setTimeout(fetchPincode, 500);
    return () => clearTimeout(timer);
    // selectedArea is intentionally excluded — effect should only fire on pin code changes;
    // selectedArea is read only in the "invalid pin" branch where it's still the right value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinCode, setValue]);

  const handleSelectArea = (val: string) => {
    setValue("area", val, { shouldValidate: true });
    const po = postOffices.find((p) => p.Name === val);
    if (po) {
      setValue("state", po.State, { shouldValidate: true });
      setValue("city", po.District || po.Block || "", { shouldValidate: true });
    }
  };

  const mobileReg = register("mobile");
  const pinReg = register("pin_code");

  return (
    <div className="grid gap-4 animate-in fade-in zoom-in-95 duration-300">
      <AuthInput
        label="Official School Email *"
        type="email"
        autoComplete="email"
        placeholder="admin@yourschool.edu.in"
        error={errors.email?.message}
        hint="School's primary contact email address"
        {...register("email")}
      />

      <div className="grid grid-cols-2 gap-3">
        <AuthInput
          label="Mobile Number *"
          type="tel"
          inputMode="numeric"
          placeholder="10-digit number"
          maxLength={10}
          error={errors.mobile?.message}
          {...mobileReg}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            mobileReg.onChange(e);
          }}
        />
        <AuthInput
          label="Office Phone"
          type="tel"
          placeholder="Landline (optional)"
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <hr className="border-border/50 my-1" />

      <AuthInput
        label="Street Address *"
        type="text"
        placeholder="Building, Street, Area"
        autoComplete="street-address"
        error={errors.address_line_1?.message}
        {...register("address_line_1")}
      />

      <AuthInput
        label="Address Line 2"
        type="text"
        placeholder="Locality, Landmark (optional)"
        error={errors.address_line_2?.message}
        {...register("address_line_2")}
      />

      <div className="grid gap-4">
        <AuthInput
          label="PIN Code *"
          type="text"
          inputMode="numeric"
          placeholder="6-digit PIN"
          maxLength={6}
          autoComplete="postal-code"
          error={errors.pin_code?.message || pincodeError}
          {...pinReg}
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            pinReg.onChange(e);
          }}
        />

        {loadingPincode && (
          <div className="flex items-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Fetching area
            details...
          </div>
        )}

        {postOffices.length > 0 ? (
          <>
            <SearchableSelect
              label="Select Area / Post Office *"
              options={areaOptions}
              value={selectedArea}
              onChange={handleSelectArea}
              placeholder="Select area..."
              searchPlaceholder="Search area by name..."
              error={errors.area?.message as string | undefined}
            />
            <input type="hidden" {...register("area")} />
          </>
        ) : (
          <input type="hidden" {...register("area")} />
        )}
        <input type="hidden" {...register("area_required")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AuthInput
          label="City *"
          type="text"
          autoComplete="address-level2"
          placeholder="City / District"
          error={errors.city?.message}
          readOnly={!!selectedArea}
          className={
            selectedArea
              ? "bg-muted/50 text-muted-foreground pointer-events-none"
              : ""
          }
          {...register("city")}
        />
        <AuthSelect
          label="State *"
          error={errors.state?.message}
          className={
            selectedArea
              ? "bg-muted/50 text-muted-foreground pointer-events-none"
              : ""
          }
          tabIndex={selectedArea ? -1 : 0}
          {...register("state")}
        >
          <option value="">— Select state / UT —</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </AuthSelect>
      </div>
    </div>
  );
}
