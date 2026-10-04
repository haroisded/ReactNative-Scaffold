export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      merchants: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["store_category"]
          contact_email: string | null
          created_at: string
          currency: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          category: Database["public"]["Enums"]["store_category"]
          contact_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          name: string
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["store_category"]
          contact_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          name: string
          parent_id: string | null
          scope: Database["public"]["Enums"]["category_scope"]
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          name: string
          parent_id?: string | null
          scope: Database["public"]["Enums"]["category_scope"]
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          name?: string
          parent_id?: string | null
          scope?: Database["public"]["Enums"]["category_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_fk"
            columns: ["parent_id", "merchant_id", "scope"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "merchant_id", "scope"]
          },
        ]
      }
      product_components: {
        Row: {
          component_id: string
          id: string
          merchant_id: string
          position: number
          product_id: string
          qty: number
          unit: Database["public"]["Enums"]["measure_unit"] | null
        }
        Insert: {
          component_id: string
          id?: string
          merchant_id: string
          position?: number
          product_id: string
          qty: number
          unit?: Database["public"]["Enums"]["measure_unit"] | null
        }
        Update: {
          component_id?: string
          id?: string
          merchant_id?: string
          position?: number
          product_id?: string
          qty?: number
          unit?: Database["public"]["Enums"]["measure_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "product_components_component_fk"
            columns: ["component_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "product_components_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      product_custom_fields: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["custom_field_kind"]
          label: string
          merchant_id: string
          position: number
          product_id: string
          value: string | null
        }
        Insert: {
          id?: string
          kind?: Database["public"]["Enums"]["custom_field_kind"]
          label: string
          merchant_id: string
          position?: number
          product_id: string
          value?: string | null
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["custom_field_kind"]
          label?: string
          merchant_id?: string
          position?: number
          product_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_fields_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      product_groups: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          merchant_id: string
          name: string
          scope: Database["public"]["Enums"]["category_scope"]
          subcategory_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          name: string
          scope?: Database["public"]["Enums"]["category_scope"]
          subcategory_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          name?: string
          scope?: Database["public"]["Enums"]["category_scope"]
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_category_fk"
            columns: ["category_id", "merchant_id", "scope"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "merchant_id", "scope"]
          },
          {
            foreignKeyName: "product_groups_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_groups_subcategory_fk"
            columns: ["subcategory_id", "merchant_id", "scope"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "merchant_id", "scope"]
          },
        ]
      }
      product_operating_hours: {
        Row: {
          closes: string
          id: string
          merchant_id: string
          opens: string
          product_id: string
          weekday: number
        }
        Insert: {
          closes: string
          id?: string
          merchant_id: string
          opens: string
          product_id: string
          weekday: number
        }
        Update: {
          closes?: string
          id?: string
          merchant_id?: string
          opens?: string
          product_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_operating_hours_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      product_rate_tiers: {
        Row: {
          id: string
          merchant_id: string
          note: string | null
          period: Database["public"]["Enums"]["rate_period"]
          position: number
          price: number
          product_id: string
        }
        Insert: {
          id?: string
          merchant_id: string
          note?: string | null
          period: Database["public"]["Enums"]["rate_period"]
          position?: number
          price: number
          product_id: string
        }
        Update: {
          id?: string
          merchant_id?: string
          note?: string | null
          period?: Database["public"]["Enums"]["rate_period"]
          position?: number
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_rate_tiers_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      product_variant_attributes: {
        Row: {
          id: string
          merchant_id: string
          name: string
          position: number
          product_id: string
          values: string[]
        }
        Insert: {
          id?: string
          merchant_id: string
          name: string
          position?: number
          product_id: string
          values: string[]
        }
        Update: {
          id?: string
          merchant_id?: string
          name?: string
          position?: number
          product_id?: string
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_attributes_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          id: string
          label: string
          merchant_id: string
          options: string[]
          position: number
          price_delta: number
          product_id: string
          qty_on_hand: number | null
          sku: string | null
        }
        Insert: {
          barcode?: string | null
          id?: string
          label: string
          merchant_id: string
          options: string[]
          position?: number
          price_delta?: number
          product_id: string
          qty_on_hand?: number | null
          sku?: string | null
        }
        Update: {
          barcode?: string | null
          id?: string
          label?: string
          merchant_id?: string
          options?: string[]
          position?: number
          price_delta?: number
          product_id?: string
          qty_on_hand?: number | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      products: {
        Row: {
          advance_window_days: number | null
          attributes: string[]
          barcode: string | null
          base_unit_name: string | null
          batch_tracking: boolean
          blackout_dates: string[]
          buffer_minutes: number | null
          cancellation_fee: number | null
          capacity_per_unit: number | null
          category_id: string | null
          conversion_factor: number | null
          cost_price: number | null
          created_at: string
          default_end_time: string | null
          default_start_time: string | null
          deposit_amount: number | null
          description: string | null
          discountable: boolean
          duration_mode: Database["public"]["Enums"]["duration_mode"] | null
          expiry_alert_days: number | null
          expiry_alert_on: string | null
          expiry_date: string | null
          extra_unit_fee: number | null
          group_id: string | null
          has_variants: boolean
          id: string
          image_file: string | null
          internal_notes: string | null
          is_composite: boolean
          is_low_stock: boolean | null
          late_fee_per_hour: number | null
          lead_time_days: number | null
          max_duration: number | null
          max_duration_unit: Database["public"]["Enums"]["measure_unit"] | null
          max_stock: number | null
          merchant_id: string
          min_duration: number | null
          min_duration_unit: Database["public"]["Enums"]["measure_unit"] | null
          name: string
          overbooking_allowed: boolean
          pack_unit_name: string | null
          perishable: boolean
          pricing_unit: Database["public"]["Enums"]["measure_unit"] | null
          purchase_unit: Database["public"]["Enums"]["measure_unit"] | null
          qty_on_hand: number | null
          reorder_qty: number | null
          reorder_threshold: number | null
          scope: Database["public"]["Enums"]["category_scope"]
          sell_by: Database["public"]["Enums"]["stock_sell_by"] | null
          selling_price: number | null
          shelf_life_days: number | null
          sku: string | null
          sold_directly: boolean
          source_item_id: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_role: Database["public"]["Enums"]["stock_role"] | null
          storage_location: string | null
          subcategory_id: string | null
          supplier_id: string | null
          supplier_item_code: string | null
          tags: string[]
          tax_class_id: string | null
          total_units: number | null
          track_inventory: boolean
          type: Database["public"]["Enums"]["product_type"]
          uom: Database["public"]["Enums"]["measure_unit"] | null
          updated_at: string
          usage_unit: Database["public"]["Enums"]["measure_unit"] | null
        }
        Insert: {
          advance_window_days?: number | null
          attributes?: string[]
          barcode?: string | null
          base_unit_name?: string | null
          batch_tracking?: boolean
          blackout_dates?: string[]
          buffer_minutes?: number | null
          cancellation_fee?: number | null
          capacity_per_unit?: number | null
          category_id?: string | null
          conversion_factor?: number | null
          cost_price?: number | null
          created_at?: string
          default_end_time?: string | null
          default_start_time?: string | null
          deposit_amount?: number | null
          description?: string | null
          discountable?: boolean
          duration_mode?: Database["public"]["Enums"]["duration_mode"] | null
          expiry_alert_days?: number | null
          expiry_alert_on?: string | null
          expiry_date?: string | null
          extra_unit_fee?: number | null
          group_id?: string | null
          has_variants?: boolean
          id?: string
          image_file?: string | null
          internal_notes?: string | null
          is_composite?: boolean
          is_low_stock?: boolean | null
          late_fee_per_hour?: number | null
          lead_time_days?: number | null
          max_duration?: number | null
          max_duration_unit?: Database["public"]["Enums"]["measure_unit"] | null
          max_stock?: number | null
          merchant_id: string
          min_duration?: number | null
          min_duration_unit?: Database["public"]["Enums"]["measure_unit"] | null
          name: string
          overbooking_allowed?: boolean
          pack_unit_name?: string | null
          perishable?: boolean
          pricing_unit?: Database["public"]["Enums"]["measure_unit"] | null
          purchase_unit?: Database["public"]["Enums"]["measure_unit"] | null
          qty_on_hand?: number | null
          reorder_qty?: number | null
          reorder_threshold?: number | null
          scope: Database["public"]["Enums"]["category_scope"]
          sell_by?: Database["public"]["Enums"]["stock_sell_by"] | null
          selling_price?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          sold_directly?: boolean
          source_item_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_role?: Database["public"]["Enums"]["stock_role"] | null
          storage_location?: string | null
          subcategory_id?: string | null
          supplier_id?: string | null
          supplier_item_code?: string | null
          tags?: string[]
          tax_class_id?: string | null
          total_units?: number | null
          track_inventory?: boolean
          type: Database["public"]["Enums"]["product_type"]
          uom?: Database["public"]["Enums"]["measure_unit"] | null
          updated_at?: string
          usage_unit?: Database["public"]["Enums"]["measure_unit"] | null
        }
        Update: {
          advance_window_days?: number | null
          attributes?: string[]
          barcode?: string | null
          base_unit_name?: string | null
          batch_tracking?: boolean
          blackout_dates?: string[]
          buffer_minutes?: number | null
          cancellation_fee?: number | null
          capacity_per_unit?: number | null
          category_id?: string | null
          conversion_factor?: number | null
          cost_price?: number | null
          created_at?: string
          default_end_time?: string | null
          default_start_time?: string | null
          deposit_amount?: number | null
          description?: string | null
          discountable?: boolean
          duration_mode?: Database["public"]["Enums"]["duration_mode"] | null
          expiry_alert_days?: number | null
          expiry_alert_on?: string | null
          expiry_date?: string | null
          extra_unit_fee?: number | null
          group_id?: string | null
          has_variants?: boolean
          id?: string
          image_file?: string | null
          internal_notes?: string | null
          is_composite?: boolean
          is_low_stock?: boolean | null
          late_fee_per_hour?: number | null
          lead_time_days?: number | null
          max_duration?: number | null
          max_duration_unit?: Database["public"]["Enums"]["measure_unit"] | null
          max_stock?: number | null
          merchant_id?: string
          min_duration?: number | null
          min_duration_unit?: Database["public"]["Enums"]["measure_unit"] | null
          name?: string
          overbooking_allowed?: boolean
          pack_unit_name?: string | null
          perishable?: boolean
          pricing_unit?: Database["public"]["Enums"]["measure_unit"] | null
          purchase_unit?: Database["public"]["Enums"]["measure_unit"] | null
          qty_on_hand?: number | null
          reorder_qty?: number | null
          reorder_threshold?: number | null
          scope?: Database["public"]["Enums"]["category_scope"]
          sell_by?: Database["public"]["Enums"]["stock_sell_by"] | null
          selling_price?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          sold_directly?: boolean
          source_item_id?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_role?: Database["public"]["Enums"]["stock_role"] | null
          storage_location?: string | null
          subcategory_id?: string | null
          supplier_id?: string | null
          supplier_item_code?: string | null
          tags?: string[]
          tax_class_id?: string | null
          total_units?: number | null
          track_inventory?: boolean
          type?: Database["public"]["Enums"]["product_type"]
          uom?: Database["public"]["Enums"]["measure_unit"] | null
          updated_at?: string
          usage_unit?: Database["public"]["Enums"]["measure_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_fk"
            columns: ["category_id", "merchant_id", "scope"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "merchant_id", "scope"]
          },
          {
            foreignKeyName: "products_group_fk"
            columns: ["group_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_source_item_fk"
            columns: ["source_item_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "products_subcategory_fk"
            columns: ["subcategory_id", "merchant_id", "scope"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "merchant_id", "scope"]
          },
          {
            foreignKeyName: "products_supplier_fk"
            columns: ["supplier_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "products_tax_class_fk"
            columns: ["tax_class_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "tax_classes"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      sale_lines: {
        Row: {
          id: string
          line_total: number | null
          merchant_id: string
          name: string
          position: number
          product_id: string | null
          qty: number
          sale_id: string
          tax_rate: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_total?: number | null
          merchant_id: string
          name: string
          position?: number
          product_id?: string | null
          qty: number
          sale_id: string
          tax_rate?: number
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number | null
          merchant_id?: string
          name?: string
          position?: number
          product_id?: string | null
          qty?: number
          sale_id?: string
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "sale_lines_sale_fk"
            columns: ["sale_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      sales: {
        Row: {
          change_due: number | null
          client_key: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          merchant_id: string
          tax_total: number
          tendered: number
          total: number
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          change_due?: number | null
          client_key: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          merchant_id: string
          tax_total: number
          tendered: number
          total: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          change_due?: number | null
          client_key?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          merchant_id?: string
          tax_total?: number
          tendered?: number
          total?: number
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_cases: {
        Row: {
          code: string
          created_at: string
          id: string
          lot_id: string
          merchant_id: string
          sscc: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          lot_id: string
          merchant_id: string
          sscc?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          lot_id?: string
          merchant_id?: string
          sscc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_cases_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lot_lines"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_cases_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_cases_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_lots: {
        Row: {
          case_sscc: string | null
          cases: number | null
          cases_per_pallet: number | null
          code: string | null
          cost_per_case: number | null
          cost_per_pack: number
          created_at: string
          expires_on: string | null
          freight_share: number
          id: string
          line_cost: number | null
          location: string | null
          loose_units: number
          merchant_id: string
          notes: string | null
          packs_expected: number | null
          packs_per_case: number | null
          packs_received: number
          pallet_sscc: string | null
          pallets: number | null
          pallets_per_unit_load: number | null
          position: number
          product_id: string
          qty_received: number | null
          receipt_id: string | null
          source: Database["public"]["Enums"]["stock_lot_source"]
          unit_cost: number
          unit_load_sscc: string | null
          unit_loads: number | null
          units_per_pack: number
          units_per_pack_received: number | null
        }
        Insert: {
          case_sscc?: string | null
          cases?: number | null
          cases_per_pallet?: number | null
          code?: string | null
          cost_per_case?: number | null
          cost_per_pack?: number
          created_at?: string
          expires_on?: string | null
          freight_share?: number
          id?: string
          line_cost?: number | null
          location?: string | null
          loose_units?: number
          merchant_id: string
          notes?: string | null
          packs_expected?: number | null
          packs_per_case?: number | null
          packs_received?: number
          pallet_sscc?: string | null
          pallets?: number | null
          pallets_per_unit_load?: number | null
          position?: number
          product_id: string
          qty_received?: number | null
          receipt_id?: string | null
          source: Database["public"]["Enums"]["stock_lot_source"]
          unit_cost?: number
          unit_load_sscc?: string | null
          unit_loads?: number | null
          units_per_pack: number
          units_per_pack_received?: number | null
        }
        Update: {
          case_sscc?: string | null
          cases?: number | null
          cases_per_pallet?: number | null
          code?: string | null
          cost_per_case?: number | null
          cost_per_pack?: number
          created_at?: string
          expires_on?: string | null
          freight_share?: number
          id?: string
          line_cost?: number | null
          location?: string | null
          loose_units?: number
          merchant_id?: string
          notes?: string | null
          packs_expected?: number | null
          packs_per_case?: number | null
          packs_received?: number
          pallet_sscc?: string | null
          pallets?: number | null
          pallets_per_unit_load?: number | null
          position?: number
          product_id?: string
          qty_received?: number | null
          receipt_id?: string | null
          source?: Database["public"]["Enums"]["stock_lot_source"]
          unit_cost?: number
          unit_load_sscc?: string | null
          unit_loads?: number | null
          units_per_pack?: number
          units_per_pack_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_lots_receipt_fk"
            columns: ["receipt_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          lot_id: string
          merchant_id: string
          note: string | null
          pack_id: string
          product_id: string
          qty: number
          reason: Database["public"]["Enums"]["write_off_reason"] | null
          ref: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          lot_id: string
          merchant_id: string
          note?: string | null
          pack_id: string
          product_id: string
          qty: number
          reason?: Database["public"]["Enums"]["write_off_reason"] | null
          ref?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["stock_movement_kind"]
          lot_id?: string
          merchant_id?: string
          note?: string | null
          pack_id?: string
          product_id?: string
          qty?: number
          reason?: Database["public"]["Enums"]["write_off_reason"] | null
          ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lot_lines"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_movements_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_movements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_pack_fk"
            columns: ["pack_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_packs"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_movements_pack_fk"
            columns: ["pack_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_pick_queue"
            referencedColumns: ["pack_id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_movements_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      stock_packs: {
        Row: {
          case_id: string | null
          code: string
          created_at: string
          id: string
          lot_id: string
          merchant_id: string
          opened_at: string | null
          product_id: string
          qty_remaining: number
          serial: string | null
          units: number
        }
        Insert: {
          case_id?: string | null
          code: string
          created_at?: string
          id?: string
          lot_id: string
          merchant_id: string
          opened_at?: string | null
          product_id: string
          qty_remaining: number
          serial?: string | null
          units: number
        }
        Update: {
          case_id?: string | null
          code?: string
          created_at?: string
          id?: string
          lot_id?: string
          merchant_id?: string
          opened_at?: string | null
          product_id?: string
          qty_remaining?: number
          serial?: string | null
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_packs_case_fk"
            columns: ["case_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_cases"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lot_lines"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_packs_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          freight: number
          id: string
          invoice_no: string | null
          location: string | null
          merchant_id: string
          notes: string | null
          received_by: string | null
          received_on: string
          supplier_id: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          freight?: number
          id?: string
          invoice_no?: string | null
          location?: string | null
          merchant_id: string
          notes?: string | null
          received_by?: string | null
          received_on?: string
          supplier_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          freight?: number
          id?: string
          invoice_no?: string | null
          location?: string | null
          merchant_id?: string
          notes?: string | null
          received_by?: string | null
          received_on?: string
          supplier_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_supplier_fk"
            columns: ["supplier_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      supplier_types: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_types_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          lead_time_days: number | null
          merchant_id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          supplier_type_id: string | null
          tin: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number | null
          merchant_id: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_type_id?: string | null
          tin?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number | null
          merchant_id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_type_id?: string | null
          tin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_type_fk"
            columns: ["supplier_type_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "supplier_types"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      tax_classes: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          name: string
          rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          name: string
          rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          name?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_classes_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stock_lot_lines: {
        Row: {
          case_sscc: string | null
          cases: number | null
          cases_per_pallet: number | null
          code: string | null
          cost_per_case: number | null
          cost_per_pack: number | null
          created_at: string | null
          expires_on: string | null
          freight_share: number | null
          id: string | null
          line_cost: number | null
          location: string | null
          loose_units: number | null
          merchant_id: string | null
          notes: string | null
          packs_active: number | null
          packs_open: number | null
          packs_per_case: number | null
          packs_received: number | null
          packs_total: number | null
          pallet_sscc: string | null
          pallets: number | null
          pallets_per_unit_load: number | null
          position: number | null
          product_id: string | null
          qty_received: number | null
          qty_remaining: number | null
          receipt_id: string | null
          source: Database["public"]["Enums"]["stock_lot_source"] | null
          unit_cost: number | null
          unit_load_sscc: string | null
          unit_loads: number | null
          units_per_pack: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_lots_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_lots_receipt_fk"
            columns: ["receipt_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
      stock_pick_queue: {
        Row: {
          case_id: string | null
          code: string | null
          expires_on: string | null
          lot_id: string | null
          merchant_id: string | null
          pack_id: string | null
          pick_rank: number | null
          product_id: string | null
          qty_remaining: number | null
          units: number | null
          whole_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_packs_case_fk"
            columns: ["case_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_cases"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lot_lines"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_lot_fk"
            columns: ["lot_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id", "merchant_id"]
          },
          {
            foreignKeyName: "stock_packs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_packs_product_fk"
            columns: ["product_id", "merchant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "merchant_id"]
          },
        ]
      }
    }
    Functions: {
      add_inventory_stock: { Args: { payload: Json }; Returns: string }
      delete_current_user: { Args: never; Returns: undefined }
      draw_stock: { Args: { payload: Json }; Returns: Json }
      ensure_register_faces: { Args: { p_item: string }; Returns: undefined }
      record_sale: { Args: { payload: Json }; Returns: Json }
      record_stock_movement: { Args: { payload: Json }; Returns: undefined }
      save_product: { Args: { payload: Json }; Returns: string }
      save_receipt: { Args: { payload: Json }; Returns: string }
      save_stock_item: { Args: { payload: Json }; Returns: string }
      void_receipt: {
        Args: { p_reason: string; p_receipt: string }
        Returns: undefined
      }
      void_sale: {
        Args: { p_reason: string; p_sale: string }
        Returns: undefined
      }
    }
    Enums: {
      category_scope: "products" | "rentables" | "inventory"
      custom_field_kind: "text" | "number" | "date" | "boolean"
      duration_mode: "fixed_slot" | "flexible_range"
      measure_unit:
        | "piece"
        | "box"
        | "pack"
        | "kg"
        | "g"
        | "l"
        | "ml"
        | "minute"
        | "hour"
        | "day"
        | "week"
        | "month"
        | "night"
        | "session"
      product_status: "draft" | "active" | "inactive" | "archived"
      product_type: "stock" | "rental" | "bookable" | "flat"
      rate_period: "hour" | "day" | "week" | "month" | "night"
      stock_lot_source: "stock" | "inventory"
      stock_movement_kind:
        | "receive"
        | "sale"
        | "consume"
        | "adjust"
        | "write_off"
        | "return_supplier"
        | "void"
      stock_role: "sellable" | "component" | "both"
      stock_sell_by: "pack" | "base" | "both"
      store_category:
        | "restaurant"
        | "cafe"
        | "clothing"
        | "grocery"
        | "bakery"
        | "electronics"
        | "pharmacy"
        | "bookstore"
        | "fitness"
        | "other"
      write_off_reason: "expired" | "damaged" | "lost" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      category_scope: ["products", "rentables", "inventory"],
      custom_field_kind: ["text", "number", "date", "boolean"],
      duration_mode: ["fixed_slot", "flexible_range"],
      measure_unit: [
        "piece",
        "box",
        "pack",
        "kg",
        "g",
        "l",
        "ml",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "night",
        "session",
      ],
      product_status: ["draft", "active", "inactive", "archived"],
      product_type: ["stock", "rental", "bookable", "flat"],
      rate_period: ["hour", "day", "week", "month", "night"],
      stock_lot_source: ["stock", "inventory"],
      stock_movement_kind: [
        "receive",
        "sale",
        "consume",
        "adjust",
        "write_off",
        "return_supplier",
        "void",
      ],
      stock_role: ["sellable", "component", "both"],
      stock_sell_by: ["pack", "base", "both"],
      store_category: [
        "restaurant",
        "cafe",
        "clothing",
        "grocery",
        "bakery",
        "electronics",
        "pharmacy",
        "bookstore",
        "fitness",
        "other",
      ],
      write_off_reason: ["expired", "damaged", "lost", "other"],
    },
  },
} as const
