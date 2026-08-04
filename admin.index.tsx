import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ShieldCheck,
  Users,
  BarChart3,
  FileText,
  Settings2,
  Trash2,
  Plus,
  Minus,
  Search,
  Banknote,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { isAdmin, getWalletSettings } from "@/lib/recharge.functions";
import {
  adminStats,
  adminListUsers,
  adminSetRole,
  adminAdjustCredits,
  adminDeleteContent,
  adminListContent,
  adminSetSetting,
  adminAuditLog,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminPanel,
  head: () => ({
    meta: [
      { title: "لوحة تحكم المسؤول — وَصْل" },
      { name: "description", content: "لوحة تحكم كاملة لإدارة المستخدمين والمحتوى والمدفوعات في تطبيق وَصْل" },
      { property: "og:title", content: "لوحة تحكم المسؤول — وَصْل" },
      { property: "og:description", content: "إدارة كاملة للمستخدمين والمحتوى والطلبات المالية" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SETTING_LABELS: Record<string, string> = {
  vodafone_cash_number: "رقم فودافون كاش",
  instapay_handle: "رقم/حساب إنستاباي",
  etisalat_cash_number: "رقم اتصالات كاش",
  orange_cash_number: "رقم أورنج كاش",
};

function AdminPanel() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(isAdmin);
  const statsFn = useServerFn(adminStats);

  const admin = useQuery({
    enabled: !!user,
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkAdmin(),
  });

  const stats = useQuery({
    enabled: !!admin.data?.admin,
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
  });

  if (loading || (user && admin.isLoading))
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/login" />;
  if (!admin.data?.admin) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary shadow-elegant">
              <ShieldCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">لوحة تحكم المسؤول</h1>
              <p className="text-sm text-muted-foreground">تحكم كامل في التطبيق والمستخدمين</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/recharges">
              <Banknote className="ml-1 h-4 w-4" /> طلبات الشحن والسحب
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview"><BarChart3 className="ml-1 h-4 w-4" /> نظرة عامة</TabsTrigger>
            <TabsTrigger value="users"><Users className="ml-1 h-4 w-4" /> المستخدمون</TabsTrigger>
            <TabsTrigger value="content"><FileText className="ml-1 h-4 w-4" /> المحتوى</TabsTrigger>
            <TabsTrigger value="settings"><Settings2 className="ml-1 h-4 w-4" /> الإعدادات</TabsTrigger>
            <TabsTrigger value="audit"><ScrollText className="ml-1 h-4 w-4" /> سجل العمليات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {stats.isLoading && (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}
            {stats.data && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="المستخدمون" value={stats.data.users} />
                <StatCard label="مستخدمون جدد (7 أيام)" value={stats.data.new_users_7d} />
                <StatCard label="المنشورات" value={stats.data.posts} />
                <StatCard label="الفيديوهات" value={stats.data.videos} />
                <StatCard label="سلع المتجر" value={stats.data.listings} />
                <StatCard label="الرسائل" value={stats.data.messages} />
                <StatCard label="إجمالي النقاط بالتطبيق" value={stats.data.credits_total} />
                <StatCard label="قيمة الهدايا المُرسلة" value={stats.data.gifts_value} />
                <StatCard label="الدعوات الناجحة" value={stats.data.referrals} />
                <StatCard label="طلبات شحن معلّقة" value={stats.data.pending_recharges} highlight />
                <StatCard label="طلبات سحب معلّقة" value={stats.data.pending_withdrawals} highlight />
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <UsersTab onChanged={() => qc.invalidateQueries({ queryKey: ["admin-stats"] })} />
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <ContentTab />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight && value > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{(value ?? 0).toLocaleString("ar-EG")}</p>
    </div>
  );
}

function UsersTab({ onChanged }: { onChanged: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUsers);
  const roleFn = useServerFn(adminSetRole);
  const creditsFn = useServerFn(adminAdjustCredits);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const users = useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => listFn({ data: { search: query || undefined } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    onChanged();
  };

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "admin" | "moderator"; grant: boolean }) =>
      roleFn({ data: v }),
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات");
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e, "تعذّر تحديث الصلاحيات")),
  });

  const creditMut = useMutation({
    mutationFn: (v: { user_id: string; delta: number }) => creditsFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`تم التحديث. الرصيد الجديد: ${r.balance}`);
      refresh();
    },
    onError: (e) => toast.error(friendlyError(e, "تعذّر تعديل الرصيد")),
  });

  const adjust = (id: string, sign: 1 | -1) => {
    const n = Number((amounts[id] ?? "").replace(/[^\d]/g, ""));
    if (!n) return toast.error("اكتب عدد النقاط أولاً");
    creditMut.mutate({ user_id: id, delta: sign * n });
  };

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <Input placeholder="ابحث بالاسم أو اسم المستخدم" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="outline"><Search className="h-4 w-4" /></Button>
      </form>

      {users.isLoading && <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="space-y-2">
        {users.data?.map((u: any) => (
          <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold">
                  {u.full_name || u.username}{" "}
                  {u.is_admin && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">مسؤول</span>}
                  {u.is_moderator && <span className="mr-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">مشرف</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{u.username} · {u.credits?.toLocaleString("ar-EG")} نقطة · {u.posts_count} منشور · {u.videos_count} فيديو · {u.referrals_count} دعوة
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={u.is_admin ? "destructive" : "outline"}
                  disabled={roleMut.isPending}
                  onClick={() => roleMut.mutate({ user_id: u.id, role: "admin", grant: !u.is_admin })}
                >
                  {u.is_admin ? "إزالة المسؤول" : "تعيين مسؤول"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={roleMut.isPending}
                  onClick={() => roleMut.mutate({ user_id: u.id, role: "moderator", grant: !u.is_moderator })}
                >
                  {u.is_moderator ? "إزالة المشرف" : "تعيين مشرف"}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                className="max-w-[140px]"
                placeholder="عدد النقاط"
                inputMode="numeric"
                value={amounts[u.id] ?? ""}
                onChange={(e) => setAmounts((s) => ({ ...s, [u.id]: e.target.value }))}
              />
              <Button size="sm" disabled={creditMut.isPending} onClick={() => adjust(u.id, 1)}>
                <Plus className="ml-1 h-4 w-4" /> إضافة
              </Button>
              <Button size="sm" variant="outline" disabled={creditMut.isPending} onClick={() => adjust(u.id, -1)}>
                <Minus className="ml-1 h-4 w-4" /> خصم
              </Button>
            </div>
          </div>
        ))}
        {users.data && users.data.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد مستخدمون مطابقون.</p>
        )}
      </div>
    </div>
  );
}

function ContentTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListContent);
  const delFn = useServerFn(adminDeleteContent);
  const [kind, setKind] = useState<"post" | "video" | "listing">("post");

  const items = useQuery({
    queryKey: ["admin-content", kind],
    queryFn: () => listFn({ data: { kind } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { kind, id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(friendlyError(e, "تعذّر الحذف")),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([
          ["post", "المنشورات"],
          ["video", "الفيديوهات"],
          ["listing", "سلع المتجر"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {items.isLoading && <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}

      <div className="space-y-2">
        {items.data?.map((it: any) => (
          <div key={it.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {kind === "post" ? it.content?.slice(0, 90) || "(منشور بصورة/فيديو)" : it.title}
              </p>
              <p className="text-xs text-muted-foreground">
                @{it.profile?.username ?? "—"} · {new Date(it.created_at).toLocaleString("ar-EG")}
                {kind === "video" && ` · ${it.views_count} مشاهدة`}
                {kind === "listing" && ` · ${it.price_points} نقطة · ${it.status}`}
              </p>
            </div>
            <Button size="sm" variant="destructive" disabled={delMut.isPending} onClick={() => delMut.mutate(it.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {items.data && items.data.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد محتوى.</p>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const getSettings = useServerFn(getWalletSettings);
  const setSetting = useServerFn(adminSetSetting);
  const [vals, setVals] = useState<Record<string, string>>({});

  const settings = useQuery({ queryKey: ["wallet-settings"], queryFn: () => getSettings() });

  const mut = useMutation({
    mutationFn: (v: { key: any; value: string }) => setSetting({ data: v }),
    onSuccess: () => {
      toast.success("تم حفظ الإعداد");
      qc.invalidateQueries({ queryKey: ["wallet-settings"] });
    },
    onError: (e) => toast.error(friendlyError(e, "تعذّر الحفظ")),
  });

  const current: Record<string, string | undefined> = {
    vodafone_cash_number: settings.data?.vodafone_cash,
    instapay_handle: settings.data?.instapay,
    etisalat_cash_number: settings.data?.etisalat_cash,
    orange_cash_number: settings.data?.orange_cash,
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">أرقام استلام التحويلات</h2>
      {Object.keys(SETTING_LABELS).map((k) => (
        <div key={k} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor={k}>{SETTING_LABELS[k]}</Label>
            <Input
              id={k}
              dir="ltr"
              className="mt-1"
              value={vals[k] ?? current[k] ?? ""}
              onChange={(e) => setVals((s) => ({ ...s, [k]: e.target.value }))}
            />
          </div>
          <Button
            disabled={mut.isPending}
            onClick={() => mut.mutate({ key: k, value: (vals[k] ?? current[k] ?? "").trim() })}
          >
            حفظ
          </Button>
        </div>
      ))}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  grant_role: "منح صلاحية",
  revoke_role: "إزالة صلاحية",
  adjust_credits: "تعديل النقاط",
  delete_content: "حذف محتوى",
  update_setting: "تعديل رقم استلام التحويلات",
  approve_recharge: "الموافقة على شحن",
  reject_recharge: "رفض شحن",
  approve_withdrawal: "الموافقة على سحب",
  reject_withdrawal: "رفض سحب",
};

const TARGET_LABELS: Record<string, string> = {
  user: "مستخدم",
  post: "منشور",
  video: "فيديو",
  listing: "سلعة",
  comment: "تعليق",
  setting: "إعداد",
  recharge_request: "طلب شحن",
  withdrawal_request: "طلب سحب",
};

function AuditTab() {
  const listFn = useServerFn(adminAuditLog);
  const logs = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => listFn({ data: { limit: 200 } }),
  });

  if (logs.isLoading)
    return <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (!logs.data?.length)
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
        لا توجد عمليات إدارية مُسجَّلة بعد.
      </div>
    );

  return (
    <div className="space-y-2">
      {logs.data.map((l: any) => (
        <div key={l.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {ACTION_LABELS[l.action] ?? l.action}
              <span className="text-muted-foreground text-sm">
                {" "}· {TARGET_LABELS[l.target_type] ?? l.target_type}
                {l.target_username ? ` @${l.target_username}` : l.target_id ? ` ${String(l.target_id).slice(0, 8)}` : ""}
              </span>
            </p>
            <span className="text-[11px] text-muted-foreground">
              {new Date(l.created_at).toLocaleString("ar-EG")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            بواسطة: {l.actor_username ? `@${l.actor_username}` : "غير معروف"}
          </p>
          {l.details && Object.keys(l.details).length > 0 && (
            <pre dir="ltr" className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-2 text-[11px]">
              {JSON.stringify(l.details, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
