/**
 * Platform-admin Schools directory. Lists every school with live enrolment /
 * teacher counts and its active principal, flags schools that still need setup
 * (no academic session or no class codes → students can't join), and lets an
 * admin register a fully-formed school manually (partner/pilot schools that skip
 * onboarding). Click through to the School Detail page to manage everything else.
 */
import { useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Plus,
  GraduationCap,
  Users as UsersIcon,
  MapPin,
  AlertTriangle,
  Info,
} from "lucide-react";
import { adminApi } from "@/features/admin/api/admin";
import { getErrorMessage } from "@/shared/lib/utils";
import type { CreateSchoolRequest, SchoolListItem } from "@/features/admin/types";
import {
  SCHOOL_BOARDS,
  SCHOOL_TYPES,
  MEDIUM_OPTIONS,
  GRADE_OPTIONS,
} from "@/features/admin/constants";
import { Modal } from "@/shared/components/ui/Modal";
import { Alert } from "@/shared/components/ui/Alert";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Badge } from "@/shared/components/ui/Badge";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Panel } from "@/shared/components/ui/Panel";
import { FilterBar } from "@/shared/components/ui/FilterBar";
import { SearchInput } from "@/shared/components/ui/SearchInput";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { ListSkeleton } from "@/shared/components/ui/Skeleton";

const SESSION_RE = /^\d{4}-\d{2,4}$/;
const optional = () => z.string().trim().max(500).optional().or(z.literal(""));

const createSchoolSchema = z
  .object({
    // Identity
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(255),
    code: z.string().trim().max(50).optional().or(z.literal("")),
    board: z.string().min(1, "Select a board"),
    other_board: z.string().trim().max(100).optional().or(z.literal("")),
    school_type: z.string().optional().or(z.literal("")),
    other_school_type: z.string().trim().max(100).optional().or(z.literal("")),
    established_year: z.string().trim().max(10).optional().or(z.literal("")),
    udise_code: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "UDISE is an 11-digit number")
      .optional()
      .or(z.literal("")),
    // Contact & address
    email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    mobile: z.string().trim().max(20).optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    address_line_1: optional(),
    address_line_2: optional(),
    city: z.string().trim().min(1, "City is required").max(100),
    state: z.string().trim().min(1, "State is required").max(100),
    pin_code: z.string().trim().max(10).optional().or(z.literal("")),
    // Academics
    current_session: z
      .string()
      .trim()
      .regex(SESSION_RE, "Use a session like 2025-26"),
    medium_of_instruction: z.string().optional().or(z.literal("")),
    other_medium_of_instruction: z.string().trim().max(100).optional().or(z.literal("")),
    classes_from: z.string().optional().or(z.literal("")),
    classes_to: z.string().optional().or(z.literal("")),
    student_count: z
      .string()
      .trim()
      .regex(/^\d*$/, "Numbers only")
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.board !== "OTHER" || !!d.other_board?.trim(), {
    path: ["other_board"],
    message: "Specify the board name",
  })
  .refine((d) => d.school_type !== "OTHER" || !!d.other_school_type?.trim(), {
    path: ["other_school_type"],
    message: "Specify the school type",
  })
  .refine(
    (d) =>
      !d.classes_from ||
      !d.classes_to ||
      Number(d.classes_to) >= Number(d.classes_from),
    { path: ["classes_to"], message: "Highest grade must be ≥ lowest" },
  );

type CreateSchoolForm = z.infer<typeof createSchoolSchema>;

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "needs_setup", label: "Needs setup" },
] as const;

/** Active but unusable: no academic session, or no class code for students to join. */
function needsSetup(s: SchoolListItem): boolean {
  return s.is_active && (!s.current_session || s.class_codes === 0);
}

const clean = (v?: string) => {
  const s = v?.trim();
  return s ? s : undefined;
};

// ── Create-school modal ─────────────────────────────────────────────────────

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CreateSchoolModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (payload: CreateSchoolRequest, id: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateSchoolForm>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: { board: "", school_type: "", medium_of_instruction: "" },
  });

  const board = watch("board");
  const schoolType = watch("school_type");
  const medium = watch("medium_of_instruction");
  const formId = useId();

  const createMutation = useMutation({
    mutationFn: (data: CreateSchoolRequest) => adminApi.createSchool(data),
    onSuccess: (res, variables) => {
      onCreated(variables, res.id);
      reset();
    },
  });

  const close = () => {
    reset();
    createMutation.reset();
    onClose();
  };

  const submit = handleSubmit((data) => {
    const payload: CreateSchoolRequest = {
      name: data.name.trim(),
      board: data.board,
      city: data.city.trim(),
      state: data.state.trim(),
      current_session: data.current_session.trim(),
      code: clean(data.code),
      other_board: data.board === "OTHER" ? clean(data.other_board) : undefined,
      school_type: clean(data.school_type),
      other_school_type:
        data.school_type === "OTHER" ? clean(data.other_school_type) : undefined,
      established_year: clean(data.established_year),
      udise_code: clean(data.udise_code),
      email: clean(data.email),
      mobile: clean(data.mobile),
      phone: clean(data.phone),
      address_line_1: clean(data.address_line_1),
      address_line_2: clean(data.address_line_2),
      pin_code: clean(data.pin_code),
      medium_of_instruction: clean(data.medium_of_instruction),
      other_medium_of_instruction:
        data.medium_of_instruction === "Other"
          ? clean(data.other_medium_of_instruction)
          : undefined,
      classes_from: clean(data.classes_from),
      classes_to: clean(data.classes_to),
      student_count: clean(data.student_count) ? Number(data.student_count) : undefined,
    };
    createMutation.mutate(payload);
  });

  const boardOptions = [
    { value: "", label: "Select a board…" },
    ...SCHOOL_BOARDS.map((b) => ({ value: b.value, label: b.label })),
  ];
  const typeOptions = [
    { value: "", label: "Select a type (optional)…" },
    ...SCHOOL_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];
  const mediumOptions = [
    { value: "", label: "Select a medium (optional)…" },
    ...MEDIUM_OPTIONS.map((m) => ({ value: m.value, label: m.label })),
  ];
  const gradeFrom = [
    { value: "", label: "— From —" },
    ...GRADE_OPTIONS.map((g) => ({ value: g.value, label: g.label })),
  ];
  const gradeTo = [
    { value: "", label: "— To —" },
    ...GRADE_OPTIONS.filter((g) => g.value !== "0").map((g) => ({
      value: g.value,
      label: g.label,
    })),
  ];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add School"
      size="2xl"
      icon={<Building2 />}
      description="Register a partner or pilot school that skips onboarding."
      footer={
        <>
          <Button variant="outline" type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={createMutation.isPending}
          >
            Create School
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-8">
        {createMutation.isError && (
          <Alert variant="error">{getErrorMessage(createMutation.error)}</Alert>
        )}

        <FormSection
          icon={<Building2 />}
          title="Identity"
          description="How the school is named and classified."
        >
          <div className="sm:col-span-2">
            <Input
              label="School Name *"
              placeholder="Springfield Elementary School"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <Input
            label="Code"
            hint="Optional short identifier, e.g. SPE-001"
            placeholder="SPE-001"
            error={errors.code?.message}
            {...register("code")}
          />
          <Select
            label="Board *"
            options={boardOptions}
            error={errors.board?.message}
            {...register("board")}
          />
          {board === "OTHER" && (
            <Input
              label="Board name *"
              placeholder="e.g. NIOS"
              error={errors.other_board?.message}
              {...register("other_board")}
            />
          )}
          <Select
            label="School Type"
            options={typeOptions}
            error={errors.school_type?.message}
            {...register("school_type")}
          />
          {schoolType === "OTHER" && (
            <Input
              label="School type name *"
              placeholder="e.g. Trust-run"
              error={errors.other_school_type?.message}
              {...register("other_school_type")}
            />
          )}
          <Input
            label="Established Year"
            placeholder="1998"
            error={errors.established_year?.message}
            {...register("established_year")}
          />
          <Input
            label="UDISE Code"
            hint="11-digit government code (optional)"
            placeholder="12345678901"
            inputMode="numeric"
            maxLength={11}
            error={errors.udise_code?.message}
            {...register("udise_code")}
          />

        </FormSection>

        <FormSection
          icon={<MapPin />}
          title="Contact &amp; address"
          description="Where the school is and how to reach the office."
        >
          <Input
            label="Email"
            type="email"
            placeholder="office@school.edu"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Mobile"
            placeholder="+91 98765 43210"
            error={errors.mobile?.message}
            {...register("mobile")}
          />
          <Input
            label="Address line 1"
            placeholder="742 Evergreen Terrace"
            error={errors.address_line_1?.message}
            {...register("address_line_1")}
          />
          <Input
            label="Address line 2"
            placeholder="Near the water tower"
            error={errors.address_line_2?.message}
            {...register("address_line_2")}
          />
          <Input
            label="City *"
            placeholder="Springfield"
            error={errors.city?.message}
            {...register("city")}
          />
          <Input
            label="State *"
            placeholder="Illinois"
            error={errors.state?.message}
            {...register("state")}
          />
          <Input
            label="PIN code"
            placeholder="123456"
            error={errors.pin_code?.message}
            {...register("pin_code")}
          />

        </FormSection>

        <FormSection
          icon={<GraduationCap />}
          title="Academics"
          description="Session and grade range that power the module dropdowns."
        >
          <div className="sm:col-span-2">
            <Input
              label="Academic Session *"
              hint="e.g. 2025-26 — powers module session dropdowns"
              placeholder="2025-26"
              error={errors.current_session?.message}
              {...register("current_session")}
            />
          </div>
          <Select
            label="Medium of Instruction"
            options={mediumOptions}
            error={errors.medium_of_instruction?.message}
            {...register("medium_of_instruction")}
          />
          {medium === "Other" && (
            <Input
              label="Medium name *"
              placeholder="e.g. French"
              error={errors.other_medium_of_instruction?.message}
              {...register("other_medium_of_instruction")}
            />
          )}
          <Select
            label="Classes From"
            options={gradeFrom}
            error={errors.classes_from?.message}
            {...register("classes_from")}
          />
          <Select
            label="Classes To"
            options={gradeTo}
            error={errors.classes_to?.message}
            {...register("classes_to")}
          />
          <Input
            label="Reported Students"
            hint="Approximate enrolment (optional)"
            placeholder="500"
            inputMode="numeric"
            error={errors.student_count?.message}
            {...register("student_count")}
          />
        </FormSection>

        <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
          <span>
            After creating, generate class codes for the grade range so students
            can self-register, then provision a principal.
          </span>
        </p>
      </form>
    </Modal>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export function SchoolsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: schools, isLoading, error } = useQuery({
    queryKey: ["admin", "schools"],
    queryFn: () => adminApi.listSchools(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (schools ?? []).filter((s) => {
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      if (statusFilter === "needs_setup" && !needsSetup(s)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.city ?? "").toLowerCase().includes(q) ||
        (s.udise_code ?? "").toLowerCase().includes(q) ||
        (s.principal_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [schools, statusFilter, search]);

  const handleCreated = (payload: CreateSchoolRequest, id: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
    setShowCreate(false);
    // Carry the grade range so the detail page can offer one-click code generation.
    navigate(`/admin/schools/${id}`, {
      state: {
        justCreated: true,
        classesFrom: payload.classes_from,
        classesTo: payload.classes_to,
      },
    });
  };

  return (
    <div className="space-y-6">
      <FilterBar hideHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(opt.value)}
                className="rounded-full"
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, city, UDISE…"
              className="w-full lg:w-72"
            />
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreate(true)}
              className="shrink-0"
            >
              New School
            </Button>
          </div>
        </div>
      </FilterBar>

      {error && (
        <Alert variant="error">
          {getErrorMessage(error) || "Failed to load schools."}
        </Alert>
      )}

      {isLoading ? (
        <ListSkeleton items={6} />
      ) : (
        <Panel
          flush
          icon={<Building2 className="h-4 w-4" />}
          title="Schools"
          actions={<Badge variant="primary">{filtered.length} shown</Badge>}
        >
          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Building2 className="h-10 w-10" />}
                title="No schools found"
                description={
                  search
                    ? `No results for “${search}”.`
                    : "Approve an onboarding application or add a school manually to get started."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((s) => {
                const incomplete = needsSetup(s);
                return (
                  <li
                    key={s.id}
                    className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={s.name} seed={s.id} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {s.name}
                          {s.code && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {s.code}
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.principal_name || s.principal_email ? (
                            <>{s.principal_name || s.principal_email}</>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              No principal assigned
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground/80">
                          {(s.city || s.state) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {[s.city, s.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {s.students} students
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            {s.teachers} teachers
                          </span>
                          {s.current_session && (
                            <span className="text-muted-foreground/70">
                              {s.current_session}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      {incomplete && (
                        <span
                          title={
                            !s.current_session
                              ? "No academic session set"
                              : "No class codes — students can't join"
                          }
                        >
                          <Badge variant="warning">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Needs setup
                          </Badge>
                        </span>
                      )}
                      <Badge variant={s.is_active ? "success" : "default"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="opacity-80 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
                      >
                        <Link to={`/admin/schools/${s.id}`}>Manage</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      )}

      <CreateSchoolModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
