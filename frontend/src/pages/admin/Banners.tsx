import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListBanners, useCreateBanner, useDeleteBanner, uploadImageToS3 } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Trash2, ImageIcon, Upload, GalleryHorizontalEnd } from "lucide-react";
import { useState, useRef } from "react";

export default function BannersAdmin() {
  const { data: banners = [], isLoading } = useListBanners();
  const createBanner = useCreateBanner();
  const deleteBanner = useDeleteBanner();

  const [open, setOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const handleCreateNew = () => {
    setTitle("");
    setSubtitle("");
    setImageUrl("");
    setLinkUrl("");
    setImagePreview(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !imageUrl.trim()) {
      toast.error("Title and image are required.");
      return;
    }
    createBanner.mutate(
      { title: title.trim(), subtitle: subtitle.trim() || undefined, imageUrl: imageUrl.trim(), linkUrl: linkUrl.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Banner created successfully!");
          setOpen(false);
        },
        onError: () => toast.error("Failed to create banner."),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteBanner.mutate(id, {
      onSuccess: () => {
        toast.success("Banner deleted.");
        setDeletingBanner(null);
      },
      onError: () => toast.error("Failed to delete banner."),
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-sidebar-foreground tracking-tight">Hero Banners</h1>
          <p className="text-muted-foreground mt-1">Manage the scrolling hero banners on the homepage.</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Add Banner
        </Button>
      </div>

      {/* Create Banner Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GalleryHorizontalEnd className="w-5 h-5 text-primary" />
              Add New Hero Banner
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Banner Title *</label>
              <Input placeholder="e.g. Fresh Summer Sale" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Subtitle (Optional)</label>
              <Input placeholder="e.g. Up to 50% off on seasonal fruits" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Banner Image *</label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {(imagePreview || imageUrl) ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={imagePreview || imageUrl}
                      alt="Banner preview"
                      className="w-24 h-14 rounded-lg object-cover border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">Image uploaded</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{imageUrl}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="shrink-0">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Replace
                    </Button>
                  </div>
                ) : (
                  <div className="py-3">
                    <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Click to upload banner image</p>
                    <p className="text-xs text-muted-foreground/70">Wide landscape images work best (1200×400 or larger)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const localPreview = URL.createObjectURL(file);
                    setImagePreview(localPreview);
                    try {
                      setUploading(true);
                      toast.info('Uploading banner image...');
                      const url = await uploadImageToS3(file, 'images/banners');
                      setImageUrl(url);
                      setImagePreview(null);
                      toast.success('Banner image uploaded!');
                    } catch {
                      toast.error('Upload failed. Try again.');
                      setImagePreview(null);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Uploading to S3...
                </div>
              )}
              <Input
                className="mt-2"
                placeholder="Or paste image URL directly..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Link URL (Optional)</label>
              <Input placeholder="e.g. /products or https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <DialogClose asChild><Button variant="outline" type="button">Cancel</Button></DialogClose>
            <Button onClick={handleSubmit} disabled={createBanner.isPending || uploading}>
              {createBanner.isPending ? "Creating..." : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBanner} onOpenChange={(isOpen) => !isOpen && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the banner <strong>{deletingBanner?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingBanner && handleDelete(deletingBanner.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Banner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Banner Grid */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-accent/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <GalleryHorizontalEnd className="w-4 h-4" /> {banners.length} banner{banners.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-muted-foreground">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <GalleryHorizontalEnd className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No hero banners yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add banners to display on the homepage carousel.</p>
            <Button onClick={handleCreateNew} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Add First Banner
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {banners.map((banner) => (
              <div key={banner.id} className="group relative border rounded-xl overflow-hidden bg-background hover:shadow-md transition-shadow">
                <div className="aspect-[3/1] overflow-hidden bg-muted">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="133" fill="%23f3f4f6"><rect width="400" height="133"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="14">No Image</text></svg>'; }}
                  />
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{banner.title}</p>
                    {banner.subtitle && <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setDeletingBanner(banner)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
