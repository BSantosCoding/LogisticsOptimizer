-- Add granular permission columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_edit_countries boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_form_factors boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_containers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_templates boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_tags boolean DEFAULT false;

-- Update RLS policies for countries
-- Allow read access to all authenticated users in the company (existing policy usually covers this, but ensuring consistency)
-- We are ALTERING the existing policy "Users can update their company's countries" if it exists, or creating a replacement logic if we can't easily alter in SQL without dropping. 
-- Since we want to "alter" and not "create new", we will DROP and RE-CREATE with the same name to effectively alter it, as ALTER POLICY has limited capabilities for changing the definition.

DROP POLICY IF EXISTS "Users can update their company's countries" ON public.countries;
CREATE POLICY "Users can update their company's countries" ON public.countries
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_countries FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_countries FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their company's countries" ON public.countries;
CREATE POLICY "Users can insert their company's countries" ON public.countries
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_countries FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can delete their company's countries" ON public.countries;
CREATE POLICY "Users can delete their company's countries" ON public.countries
    FOR DELETE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_countries FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );


-- Update RLS policies for form_factors
DROP POLICY IF EXISTS "Users can update their company's form_factors" ON public.form_factors;
CREATE POLICY "Users can update their company's form_factors" ON public.form_factors
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_form_factors FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_form_factors FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their company's form_factors" ON public.form_factors;
CREATE POLICY "Users can insert their company's form_factors" ON public.form_factors
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_form_factors FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can delete their company's form_factors" ON public.form_factors;
CREATE POLICY "Users can delete their company's form_factors" ON public.form_factors
    FOR DELETE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_form_factors FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );


-- Update RLS policies for containers
DROP POLICY IF EXISTS "Users can update their company's containers" ON public.containers;
CREATE POLICY "Users can update their company's containers" ON public.containers
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_containers FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_containers FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their company's containers" ON public.containers;
CREATE POLICY "Users can insert their company's containers" ON public.containers
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_containers FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can delete their company's containers" ON public.containers;
CREATE POLICY "Users can delete their company's containers" ON public.containers
    FOR DELETE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_containers FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );


-- Update RLS policies for templates
DROP POLICY IF EXISTS "Users can update their company's templates" ON public.templates;
CREATE POLICY "Users can update their company's templates" ON public.templates
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_templates FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_templates FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their company's templates" ON public.templates;
CREATE POLICY "Users can insert their company's templates" ON public.templates
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_templates FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can delete their company's templates" ON public.templates;
CREATE POLICY "Users can delete their company's templates" ON public.templates
    FOR DELETE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_templates FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );


-- Update RLS policies for tags
DROP POLICY IF EXISTS "Users can update their company's tags" ON public.tags;
CREATE POLICY "Users can update their company's tags" ON public.tags
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_tags FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_tags FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can insert their company's tags" ON public.tags;
CREATE POLICY "Users can insert their company's tags" ON public.tags
    FOR INSERT TO authenticated
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_tags FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );

DROP POLICY IF EXISTS "Users can delete their company's tags" ON public.tags;
CREATE POLICY "Users can delete their company's tags" ON public.tags
    FOR DELETE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager') OR
            (SELECT can_edit_tags FROM public.profiles WHERE id = (SELECT auth.uid())) = true
        )
    );


-- Update profiles policies to allow Managers to edit permissions
-- Assuming there is a policy "Users can update their company's profiles" or similar
-- We want to allow Admins to update everything, and Managers to update permissions for Standard users (or just generally update profiles if they are in the company)

DROP POLICY IF EXISTS "Admins and Managers can update profiles" ON public.profiles;
CREATE POLICY "Admins and Managers can update profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager')
        )
    )
    WITH CHECK (
        (company_id = (SELECT company_id FROM public.profiles WHERE id = (SELECT auth.uid()))) AND 
        (
            (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) IN ('super_admin', 'admin', 'manager')
        )
    );
