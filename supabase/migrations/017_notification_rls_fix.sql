-- 017: Fix notifications RLS policies for update and delete
-- Allow authenticated staff to update notifications (mark as read) for their role
-- Allow authenticated staff to delete their notifications

-- Policy: Staff can update notifications for their role (mark as read)
CREATE POLICY "Staff can update notifications for their role"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = target_role
      AND profiles.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = target_role
      AND profiles.active = true
    )
  );

-- Policy: Staff can delete notifications for their role
CREATE POLICY "Staff can delete notifications for their role"
  ON public.notifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = target_role
      AND profiles.active = true
    )
  );

-- Admin can manage ALL notifications (backup policy)
CREATE POLICY "Admin can manage all notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.active = true
    )
  );
