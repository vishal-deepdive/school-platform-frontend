import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Layers, Library, List, Plus, SearchX } from "lucide-react";
import toast from "@/shared/lib/toast";
import { Button } from "@/shared/components/ui/Button";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Modal } from "@/shared/components/ui/Modal";
import {
  ModuleHeaderActions,
  ModuleHeaderLeading,
} from "@/shared/components/ui/ModuleHeaderActions";
import { Pagination } from "@/shared/components/ui/Pagination";
import { RefreshButton } from "@/shared/components/ui/RefreshButton";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { Skeleton, TableBodySkeleton } from "@/shared/components/ui/Skeleton";
import { ForbiddenState } from "@/shared/components/errors/ForbiddenState";
import { useActiveSchool } from "@/shared/hooks/useActiveSchool";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { isStaff } from "@/shared/lib/permissions";
import { getErrorMessage, isForbiddenError } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/store/auth";
import {
  useDeleteRagDocument,
  useRagDocuments,
  useRagDocumentsSummary,
  useRagMediums,
  useRetryRagIngest,
} from "@/features/rag/hooks/useRag";
import {
  ALL_SUBJECTS,
  useLibraryState,
  type LibraryState,
  type LibraryView,
} from "@/features/rag/hooks/useLibraryState";
import { useLiveDocumentStatuses } from "@/features/rag/hooks/useLiveDocumentStatuses";
import { compareChapters } from "@/features/rag/lib/documentStatus";
import type { DocumentClassSummary, DocumentItem } from "@/features/rag/types";
import { ChapterTable, type RowAction } from "@/features/rag/components/library/ChapterTable";
import { ClassList } from "@/features/rag/components/library/ClassList";
import { ChapterPreview } from "@/features/rag/components/library/ChapterPreview";
import {
  LibraryFilters,
  LibraryStats,
  type LibraryFilterField,
} from "@/features/rag/components/library/LibraryToolbar";
import { SubjectChips } from "@/features/rag/components/library/SubjectChips";
import {
  UploadChaptersModal,
  type UploadDefaults,
} from "@/features/rag/components/library/UploadChaptersModal";

const FLAT_PAGE_SIZE = 50;
// Browse shows one class/subject at a time; the API maximum keeps that to a
// single page in practice, so chapters can be sorted naturally client-side.
const BROWSE_PAGE_SIZE = 100;

const NO_CLASSES: DocumentClassSummary[] = [];
const NO_STRINGS: string[] = [];

const VIEWS: { value: LibraryView; label: string; icon: React.ReactNode }[] = [
  { value: "browse", label: "Browse", icon: <Layers className="h-3.5 w-3.5" /> },
  { value: "all", label: "All chapters", icon: <List className="h-3.5 w-3.5" /> },
];

const onlyValue = (values?: string[]) => (values?.length === 1 ? values[0] : undefined);

export function RagDocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = isStaff(user?.role);
  const isAdmin = user?.role === "admin";
  const { schoolId } = useActiveSchool();

  const [state, update] = useLibraryState();

  // ── Search: typed locally, debounced into the URL ──────────────────────────
  const [search, setSearch] = useState(state.q);
  const debouncedSearch = useDebounce(search.trim(), 350);
  const pushedSearch = useRef(state.q);
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);
  useEffect(() => {
    // The URL changed underneath the input (Back/Forward, Clear filters).
    if (state.q !== pushedSearch.current) {
      pushedSearch.current = state.q;
      setSearch(state.q);
    }
  }, [state.q]);
  useEffect(() => {
    if (debouncedSearch === pushedSearch.current) return;
    pushedSearch.current = debouncedSearch;
    updateRef.current({ q: debouncedSearch });
  }, [debouncedSearch]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: mediumData } = useRagMediums();
  const mediums = mediumData?.mediums ?? NO_STRINGS;

  const summaryQuery = useRagDocumentsSummary({
    school_id: schoolId,
    medium: state.medium || undefined,
    board: state.board || undefined,
    scope: state.scope || undefined,
    search: state.q || undefined,
  });
  const summary = summaryQuery.data;
  const classes = summary?.classes ?? NO_CLASSES;

  const isSearching = state.q !== "";
  // Search always answers with matching chapters across the library.
  const flat = state.view === "all" || isSearching;

  // Browse falls back to the first class/subject so it's never an empty shell.
  const activeClass = classes.find((c) => c.class_level === state.classLevel) ?? classes[0];
  const subjects = activeClass?.subjects ?? [];
  const showAllSubjects = state.subject === ALL_SUBJECTS && subjects.length > 1;
  const activeSubject = showAllSubjects
    ? undefined
    : subjects.find((s) => s.subject === state.subject) ?? subjects[0];

  const flatSubject = state.subject === ALL_SUBJECTS ? "" : state.subject;
  const pageSize = flat ? FLAT_PAGE_SIZE : BROWSE_PAGE_SIZE;
  const location = flat
    ? state.view === "all"
      ? { class_level: state.classLevel || undefined, subject: flatSubject || undefined }
      : {}
    : { class_level: activeClass?.class_level, subject: activeSubject?.subject };

  const docsQuery = useRagDocuments(
    {
      limit: pageSize,
      offset: (state.page - 1) * pageSize,
      ...location,
      board: state.board || undefined,
      scope: state.scope || undefined,
      medium: state.medium || undefined,
      status: state.status || undefined,
      search: state.q || undefined,
      school_id: schoolId,
    },
    { enabled: flat || !!activeClass, keepPrevious: true },
  );

  const items = useMemo(() => {
    const list = docsQuery.data?.items ?? [];
    return flat ? list : [...list].sort((a, b) => compareChapters(a, b, showAllSubjects));
  }, [docsQuery.data, flat, showAllSubjects]);
  const total = docsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { live, forget } = useLiveDocumentStatuses(items);

  // Deleting the last row of the last page shouldn't strand the user on an empty page.
  useEffect(() => {
    if (state.page > totalPages && docsQuery.isSuccess && !docsQuery.isPlaceholderData) {
      update({ page: totalPages });
    }
  }, [state.page, totalPages, docsQuery.isSuccess, docsQuery.isPlaceholderData, update]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const { mutate: deleteDocument, isPending: deleting } = useDeleteRagDocument();
  const { mutate: retryIngest } = useRetryRagIngest();
  const [pending, setPending] = useState<{ id: string; action: RowAction } | null>(null);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  // `session` remounts the upload dialog on every open, so it starts fresh
  // with defaults from wherever the user is browsing.
  const [upload, setUpload] = useState({ session: 0, open: false });

  const handleRetry = useCallback(
    (doc: DocumentItem) => {
      setPending({ id: doc.id, action: "retry" });
      retryIngest(doc.id, {
        onSuccess: () => {
          forget(doc.id);
          toast.success(`Re-indexing “${doc.chapter_name}”.`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setPending(null),
      });
    },
    [retryIngest, forget],
  );

  const confirmDelete = () => {
    if (!toDelete) return;
    const doc = toDelete;
    setPending({ id: doc.id, action: "delete" });
    deleteDocument(doc.id, {
      onSuccess: () => {
        setToDelete(null);
        toast.success("Chapter deleted.");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
      onSettled: () => setPending(null),
    });
  };

  const selectClass = useCallback(
    (classLevel: string) => update({ classLevel, subject: "" }, { push: true }),
    [update],
  );
  const selectSubject = useCallback(
    (subject: string) => update({ subject }, { push: true }),
    [update],
  );
  const changeFilter = useCallback(
    (field: LibraryFilterField, value: string) =>
      update({ [field]: value } as Partial<LibraryState>),
    [update],
  );

  const hasFilters = Boolean(
    state.scope ||
      state.board ||
      state.medium ||
      state.status ||
      state.q ||
      (state.view === "all" && (state.classLevel || flatSubject)),
  );
  const clearFilters = useCallback(() => {
    setSearch("");
    update({
      scope: "",
      board: "",
      medium: "",
      status: "",
      q: "",
      ...(state.view === "all" ? { classLevel: "", subject: "" } : {}),
    });
  }, [update, state.view]);

  const showFailed = useCallback(() => {
    setSearch("");
    update(
      { view: "all", status: "failed", classLevel: "", subject: "", q: "" },
      { push: true },
    );
  }, [update]);

  const refresh = () => {
    void summaryQuery.refetch();
    if (flat || activeClass) void docsQuery.refetch();
  };
  const refreshing =
    (summaryQuery.isFetching || docsQuery.isFetching) && !summaryQuery.isLoading;

  const uploadDefaults: UploadDefaults = flat
    ? {
        classLevel: state.view === "all" ? state.classLevel || undefined : undefined,
        subject: state.view === "all" ? flatSubject || undefined : undefined,
        board: state.board || undefined,
        medium: state.medium || undefined,
      }
    : {
        classLevel: activeClass?.class_level,
        subject: activeSubject?.subject,
        board: state.board || onlyValue(activeSubject?.boards),
        medium: state.medium || onlyValue(activeSubject?.mediums),
      };
  const openUpload = () => setUpload((u) => ({ session: u.session + 1, open: true }));
  const closeUpload = useCallback(() => setUpload((u) => ({ ...u, open: false })), []);

  // All-chapters view turns class/subject into plain filters.
  const classNames = useMemo(() => classes.map((c) => c.class_level), [classes]);
  const subjectNames = useMemo(() => {
    const pool = state.classLevel
      ? classes.filter((c) => c.class_level === state.classLevel)
      : classes;
    return Array.from(new Set(pool.flatMap((c) => c.subjects.map((s) => s.subject)))).sort();
  }, [classes, state.classLevel]);

  const forbidden =
    (summaryQuery.isError && isForbiddenError(summaryQuery.error)) ||
    (docsQuery.isError && isForbiddenError(docsQuery.error));
  if (forbidden) {
    return (
      <ForbiddenState
        title="No access to the textbook library"
        description="Your account doesn't have a knowledge-base access grant yet. Ask an admin to enable Study Assistant access for you."
      />
    );
  }

  const libraryEmpty = !summaryQuery.isLoading && summary?.total_documents === 0 && !hasFilters;
  const tableEmpty = !docsQuery.isLoading && items.length === 0;

  const chapterTable = (showLocation: boolean) => (
    <ChapterTable
      items={items}
      live={live}
      isLoading={docsQuery.isLoading}
      isStale={docsQuery.isPlaceholderData}
      canManage={canManage}
      showLocation={showLocation}
      pending={pending}
      onPreview={setPreviewDoc}
      onRetry={handleRetry}
      onDelete={setToDelete}
    />
  );

  const noMatches = (
    <EmptyState
      variant="plain"
      icon={<SearchX className="h-10 w-10" />}
      title="No chapters match"
      description={
        isSearching
          ? "Try another word, or check the spelling of the chapter or file name."
          : "Nothing here with the current filters."
      }
      action={
        hasFilters ? (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <div className="space-y-4">
      {!libraryEmpty && (
        <ModuleHeaderLeading>
          <SegmentedControl
            aria-label="Library view"
            compact
            options={VIEWS}
            value={state.view}
            onChange={(view) => update({ view }, { push: true })}
          />
        </ModuleHeaderLeading>
      )}
      <ModuleHeaderActions>
        <RefreshButton onClick={refresh} refreshing={refreshing} label="Refresh library" />
        {canManage && (
          <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openUpload}>
            Upload<span className="hidden sm:inline">&nbsp;chapters</span>
          </Button>
        )}
      </ModuleHeaderActions>

      {libraryEmpty ? (
        <EmptyState
          icon={<Library className="h-12 w-12" />}
          title="No textbooks yet"
          description={
            canManage
              ? "Upload chapter files to build the library. Once indexed, students and teachers can ask questions from them."
              : "No textbooks have been added for your school yet."
          }
          action={
            canManage ? (
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openUpload}>
                Upload chapters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-2.5">
            <LibraryFilters
              state={state}
              search={search}
              onSearchChange={setSearch}
              onFilterChange={changeFilter}
              onClear={clearFilters}
              hasFilters={hasFilters}
              boards={summary?.available_boards ?? NO_STRINGS}
              mediums={mediums}
              classOptions={state.view === "all" ? classNames : undefined}
              subjectOptions={state.view === "all" ? subjectNames : undefined}
            />
            <LibraryStats
              summary={summary}
              isLoading={summaryQuery.isLoading}
              onShowFailed={showFailed}
            />
          </div>

          {flat ? (
            <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 px-4 py-2">
                {docsQuery.isLoading ? (
                  <Skeleton className="h-4 w-40" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">{total}</span>{" "}
                    {total === 1 ? "chapter" : "chapters"}
                    {isSearching && <> matching “{state.q}”</>}
                  </p>
                )}
                {isSearching && state.view === "browse" && (
                  <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                    Back to browsing
                  </Button>
                )}
              </div>
              {tableEmpty ? noMatches : chapterTable(true)}
            </section>
          ) : summaryQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <Skeleton className="hidden h-80 rounded-xl lg:block" />
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <table className="min-w-full">
                  <tbody>
                    <TableBodySkeleton rows={6} columns={4} />
                  </tbody>
                </table>
              </div>
            </div>
          ) : !activeClass ? (
            <EmptyState
              icon={<SearchX className="h-12 w-12" />}
              title="No textbooks match these filters"
              description="Try a different source, board, or medium."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <ClassList
                classes={classes}
                selected={activeClass.class_level}
                onSelect={selectClass}
              />
              <section
                aria-label={`${activeClass.class_level} chapters`}
                className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <div className="border-b border-border/60 px-3 py-2 md:px-4">
                  <SubjectChips
                    subjects={subjects}
                    selected={showAllSubjects ? ALL_SUBJECTS : activeSubject?.subject ?? ""}
                    totalCount={activeClass.doc_count}
                    onSelect={selectSubject}
                  />
                </div>
                {tableEmpty ? noMatches : chapterTable(showAllSubjects)}
              </section>
            </div>
          )}

          {total > pageSize && (
            <Pagination
              currentPage={state.page}
              totalPages={totalPages}
              totalItems={total}
              itemsLabel="chapters"
              hasNext={state.page < totalPages}
              hasPrev={state.page > 1}
              onNext={() => update({ page: state.page + 1 })}
              onPrev={() => update({ page: state.page - 1 })}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this chapter?"
        description={
          toDelete && (
            <>
              “Chapter {toDelete.chapter_number}: {toDelete.chapter_name}” and all of its
              indexed passages will be removed, so answers can no longer cite it. This
              can't be undone.
            </>
          )
        }
        confirmLabel="Delete chapter"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => {
          if (!deleting) setToDelete(null);
        }}
      />

      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={
          previewDoc
            ? `Chapter ${previewDoc.chapter_number}: ${previewDoc.chapter_name}`
            : "Chapter preview"
        }
        icon={<Eye />}
        description={
          previewDoc
            ? `${previewDoc.class_level} · ${previewDoc.subject} · ${previewDoc.original_filename}`
            : undefined
        }
        size="full"
      >
        {previewDoc && <ChapterPreview documentId={previewDoc.id} />}
      </Modal>

      {upload.session > 0 && (
        <UploadChaptersModal
          key={upload.session}
          open={upload.open}
          onClose={closeUpload}
          defaults={uploadDefaults}
          isAdmin={isAdmin}
          activeSchoolId={schoolId}
          ownSchoolId={user?.school_id ?? schoolId}
        />
      )}
    </div>
  );
}
