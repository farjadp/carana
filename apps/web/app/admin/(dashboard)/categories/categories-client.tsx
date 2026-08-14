"use client";

import { useState } from "react";
import { Plus, Edit2, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/ui/image-uploader";
import { saveCategory } from "./actions";

export default function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    id: "",
    name: "",
    slug: "",
    icon: "",
    image_url: "",
    description: "",
    display_order: 0,
    is_active: true
  });

  const handleEdit = (cat: any) => {
    setFormData(cat);
    setIsOpen(true);
  };

  const handleNew = () => {
    setFormData({
      id: "",
      name: "",
      slug: "",
      icon: "",
      image_url: "",
      description: "",
      display_order: categories.length * 10 + 10,
      is_active: true
    });
    setIsOpen(true);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    const form = new FormData(e.currentTarget);
    if (formData.id) form.set("id", formData.id);
    form.set("image_url", formData.image_url); // from state since ImageUploader handles it
    
    // Checkbox edge case
    if (!form.get("is_active")) {
      form.delete("is_active");
    }

    const res = await saveCategory(form);
    if (res.success) {
      setIsOpen(false);
      window.location.reload(); // simple reload to get new data
    } else {
      alert("Error: " + res.error);
    }
    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">لیست دسته‌ها</h2>
        <Button onClick={handleNew} className="bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white">
          <Plus size={16} className="ml-2" />
          افزودن دسته جدید
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[color:var(--line)] overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 border-b border-[color:var(--line)] text-gray-600 font-medium">
            <tr>
              <th className="p-4">تصویر</th>
              <th className="p-4">نام</th>
              <th className="p-4">آیکن</th>
              <th className="p-4">Slug</th>
              <th className="p-4">ترتیب</th>
              <th className="p-4">وضعیت</th>
              <th className="p-4">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-16 h-9 object-cover rounded shadow-sm" />
                  ) : (
                    <div className="w-16 h-9 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </td>
                <td className="p-4 font-bold">{c.name}</td>
                <td className="p-4">{c.icon}</td>
                <td className="p-4 text-gray-500" dir="ltr">{c.slug}</td>
                <td className="p-4">{c.display_order}</td>
                <td className="p-4">
                  {c.is_active ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">فعال</span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">غیرفعال</span>
                  )}
                </td>
                <td className="p-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
                    <Edit2 size={14} className="ml-1" /> ویرایش
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{formData.id ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نام دسته‌بندی</Label>
                <Input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>اسلاگ (انگلیسی)</Label>
                <Input name="slug" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} dir="ltr" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>آیکن (ایموجی)</Label>
                <Input name="icon" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>ترتیب نمایش</Label>
                <Input type="number" name="display_order" value={formData.display_order} onChange={e => setFormData({...formData, display_order: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>توضیحات</Label>
              <Input name="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>تصویر دسته‌بندی (نسبت ۱۶:۹)</Label>
              <ImageUploader 
                bucketName="businesses"
                label="آپلود تصویر"
                value={formData.image_url}
                onChange={url => setFormData({...formData, image_url: url})}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="is_active" 
                name="is_active"
                checked={formData.is_active} 
                onChange={e => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active">فعال و قابل نمایش در سایت</Label>
            </div>

            <div className="flex justify-end pt-4 border-t mt-6 gap-2">
              <Button type="button" variant="muted" onClick={() => setIsOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={isSaving} className="bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white">
                {isSaving && <Loader2 size={16} className="animate-spin ml-2" />}
                ذخیره اطلاعات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
