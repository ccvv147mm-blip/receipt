import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Loader2, MessageSquare, Trash2, Package, Wrench, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/marketplace/$listingId")({ component: ListingPage });

function ListingPage() {
  const { listingId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [buying, setBuying] = useState(false);

  const q = useQuery({
    enabled: !!user,
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).single();
      if (error) throw error;
      const { data: seller } = await supabase
        .from("profiles").select("id, username, full_name, avatar_url").eq("id", data.seller_id).single();
      return { ...data, seller } as any;
    },
  });

  const contact = async () => {
    if (!q.data) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user!.id,
      recipient_id: q.data.seller_id,
      content: `مرحباً، أنا مهتم بـ "${q.data.title}" في المتجر.`,
    });
    if (error) return toast.error(friendlyError(error, "تعذّر إرسال الرسالة"));
    toast.success("تم إرسال رسالة للبائع");
    navigate({ to: "/messages" });
  };

  const buy = async () => {
    if (!q.data) return;
    if (!confirm(`شراء "${q.data.title}" بـ ${q.data.price_points} نقطة؟`)) return;
    setBuying(true);
    try {
      const { error } = await supabase.rpc("purchase_listing", { _listing_id: listingId });
      if (error) throw error;
      toast.success("تمت عملية الشراء وأُرسل إشعار للبائع");
      qc.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/messages", search: { to: q.data.seller_id } });
    } catch (e) { toast.error(friendlyError(e, "تعذّر إتمام الشراء")); }
    finally { setBuying(false); }
  };

  const remove = async () => {
    if (!confirm("حذف هذه القائمة؟")) return;
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (error) return toast.error(friendlyError(error, "تعذّر الحذف"));
    toast.success("تم الحذف");
    navigate({ to: "/marketplace" });
  };

  if (loading || q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (!q.data) return <div className="p-8 text-center">القائمة غير موجودة</div>;

  const l = q.data;
  const isOwner = user.id === l.seller_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {l.images[0] ? (
            <div className="grid gap-1 sm:grid-cols-2">
              {l.images.slice(0, 4).map((src: string, i: number) => (
                <img key={i} src={src} alt="" className="aspect-square w-full object-cover" />
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
              {l.kind === "product" ? <Package className="h-12 w-12" /> : <Wrench className="h-12 w-12" />}
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{l.kind === "product" ? "سلعة" : "خدمة"}</span>
              {l.category && <span>· {l.category}</span>}
              {l.country && <span>· {l.country}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-bold">{l.title}</h1>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
              <Coins className="h-5 w-5" />
              <span className="text-xl font-bold">{l.price_points}</span>
              <span className="text-sm text-muted-foreground">نقطة</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed">{l.description}</p>
            {l.delivery_terms && (
              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-bold text-muted-foreground">شروط التوصيل / التسليم</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{l.delivery_terms}</p>
              </div>
            )}

            <Link to="/profile" className="mt-6 flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/50">
              <Avatar className="h-10 w-10">
                {l.seller?.avatar_url && <AvatarImage src={l.seller.avatar_url} />}
                <AvatarFallback>{(l.seller?.full_name || l.seller?.username || "?").charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold">{l.seller?.full_name || l.seller?.username}</p>
                <p className="text-xs text-muted-foreground">@{l.seller?.username}</p>
              </div>
            </Link>

            <div className="mt-4 flex flex-wrap gap-2">
              {isOwner ? (
                <Button variant="destructive" onClick={remove} className="flex-1"><Trash2 className="h-4 w-4" /> حذف</Button>
              ) : (
                <>
                  <Button onClick={buy} disabled={buying} className="flex-1 shadow-elegant">
                    {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    اشترِ بـ {l.price_points} نقطة
                  </Button>
                  <Button variant="outline" onClick={contact}>
                    <MessageSquare className="h-4 w-4" /> تواصل
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
