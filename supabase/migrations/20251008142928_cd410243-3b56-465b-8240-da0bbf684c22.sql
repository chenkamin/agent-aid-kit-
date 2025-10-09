-- Create buy_boxes table for storing user buying criteria
CREATE TABLE public.buy_boxes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cities TEXT[],
  neighborhoods TEXT[],
  zip_codes TEXT[],
  min_price NUMERIC,
  max_price NUMERIC,
  min_bedrooms INTEGER,
  max_bedrooms INTEGER,
  min_bathrooms NUMERIC,
  max_bathrooms NUMERIC,
  min_square_footage INTEGER,
  max_square_footage INTEGER,
  home_types TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.buy_boxes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own buy boxes" 
ON public.buy_boxes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own buy boxes" 
ON public.buy_boxes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buy boxes" 
ON public.buy_boxes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buy boxes" 
ON public.buy_boxes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_buy_boxes_updated_at
BEFORE UPDATE ON public.buy_boxes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();