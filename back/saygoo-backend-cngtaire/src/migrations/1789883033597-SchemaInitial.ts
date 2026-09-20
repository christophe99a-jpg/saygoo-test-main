import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaInitial1789883033597 implements MigrationInterface {
    name = 'SchemaInitial1789883033597'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."vessels_status_enum" AS ENUM('ANNOUNCED', 'ARRIVED', 'DEPARTED')`);
        await queryRunner.query(`CREATE TABLE "vessels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vessel_name" character varying NOT NULL, "atp" character varying, "manifest_timestamp" TIMESTAMP, "manifest_customs_ok" boolean NOT NULL DEFAULT false, "handler" character varying, "berth" character varying, "eta" TIMESTAMP, "etd" TIMESTAMP, "containers_announced" integer NOT NULL DEFAULT '0', "containers_processed" integer NOT NULL DEFAULT '0', "status" "public"."vessels_status_enum" NOT NULL DEFAULT 'ANNOUNCED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_be5a5b1f0d546d8bec08e0d1583" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'CONSIGNATAIRE')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'CONSIGNATAIRE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bl_status_enum" AS ENUM('ARRIVED', 'PROCESSING', 'READY', 'RELEASED')`);
        await queryRunner.query(`CREATE TABLE "bl" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bl_number" character varying NOT NULL, "vessel_name" character varying, "client_name" character varying, "cargo" character varying, "arrival_date" character varying, "file_path" character varying, "status" "public"."bl_status_enum" NOT NULL DEFAULT 'ARRIVED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d1c91763434ad42cc77869ccc42" UNIQUE ("bl_number"), CONSTRAINT "PK_4932f35c8d0549e60e60423e6a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tracking_status_enum" AS ENUM('AT_PORT', 'IN_TRANSIT', 'DELIVERED')`);
        await queryRunner.query(`CREATE TABLE "tracking" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bl_id" uuid NOT NULL, "status" "public"."tracking_status_enum" NOT NULL DEFAULT 'AT_PORT', "location" character varying, "notes" character varying, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c6d380f3abe9852840e5aff1439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('DRAFT', 'PENDING', 'PAID', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bl_id" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "demurrage_days" numeric(10,2) NOT NULL DEFAULT '0', "demurrage_amount" numeric(10,2) NOT NULL DEFAULT '0', "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'PENDING', "client_name" character varying, "service_nature" text, "observations" text, "consignee_invoice_reference" character varying, "file_path" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PAID', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "invoice_id" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "phone_number" character varying, "payment_method" character varying, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."documents_document_type_enum" AS ENUM('BL', 'AWB', 'FACTURE_COMMERCIALE', 'PACKING_LIST', 'CERTIFICAT_ORIGINE', 'DOCUMENT_DOUANIER')`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('DEPOSITED', 'SIGNED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bl_id" uuid NOT NULL, "document_type" "public"."documents_document_type_enum" NOT NULL, "file_path" character varying NOT NULL, "status" "public"."documents_status_enum" NOT NULL DEFAULT 'DEPOSITED', "uploaded_by" character varying NOT NULL, "signed_by" character varying, "signed_at" TIMESTAMP, "archived_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."delivery_orders_status_enum" AS ENUM('PENDING', 'VALIDATED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "delivery_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "bl_id" uuid NOT NULL, "status" "public"."delivery_orders_status_enum" NOT NULL DEFAULT 'PENDING', "validated_at" TIMESTAMP, "bad_number" character varying, "importer" character varying, "container_number" character varying, "consignee" character varying, "validity_date" date, "deadline_date" date, "consignee_reference" character varying, "observations" text, "issued_by" character varying, "cancel_reason" text, "cancelled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c229efcd4549ce3b5df72240610" UNIQUE ("bad_number"), CONSTRAINT "PK_29e637736a0b5f36946edec3650" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "delivery_order_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "delivery_order_id" uuid NOT NULL, "field_name" character varying NOT NULL, "old_value" text, "new_value" text, "changed_by" character varying NOT NULL, "changed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f3d299b8b7717ade7eb90cb5525" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_container_type_enum" AS ENUM('DRY_20', 'DRY_40', 'REEFER_20', 'REEFER_40', 'OPEN_TOP', 'FLAT_RACK')`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING', 'VALIDATED', 'REFUSED')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_reference" character varying, "booking_reference" character varying, "shipping_company" character varying, "port_of_departure" character varying, "port_of_destination" character varying, "loading_date" date, "cargo_nature" character varying, "cargo_weight" numeric(10,2), "cargo_volume" numeric(10,2), "dangerous_goods" boolean NOT NULL DEFAULT false, "container_type" "public"."bookings_container_type_enum", "container_quantity" integer NOT NULL DEFAULT '1', "company_name" character varying, "contact_name" character varying, "contact_phone" character varying, "contact_email" character varying, "observations" text, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING', "refusal_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE ("booking_reference"), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tracking" ADD CONSTRAINT "FK_170e8a1b30815adce2d3bdcc4d2" FOREIGN KEY ("bl_id") REFERENCES "bl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_0a94e08ac630039e56def59b913" FOREIGN KEY ("bl_id") REFERENCES "bl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_563a5e248518c623eebd987d43e" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_c80eb93a165dc69f08ad4fc462a" FOREIGN KEY ("bl_id") REFERENCES "bl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "delivery_orders" ADD CONSTRAINT "FK_abaec5680acbc038042398dc34d" FOREIGN KEY ("bl_id") REFERENCES "bl"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "delivery_order_history" ADD CONSTRAINT "FK_d625fad1dce1bfe425423dc5a35" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "delivery_order_history" DROP CONSTRAINT "FK_d625fad1dce1bfe425423dc5a35"`);
        await queryRunner.query(`ALTER TABLE "delivery_orders" DROP CONSTRAINT "FK_abaec5680acbc038042398dc34d"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_c80eb93a165dc69f08ad4fc462a"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_563a5e248518c623eebd987d43e"`);
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_0a94e08ac630039e56def59b913"`);
        await queryRunner.query(`ALTER TABLE "tracking" DROP CONSTRAINT "FK_170e8a1b30815adce2d3bdcc4d2"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_container_type_enum"`);
        await queryRunner.query(`DROP TABLE "delivery_order_history"`);
        await queryRunner.query(`DROP TABLE "delivery_orders"`);
        await queryRunner.query(`DROP TYPE "public"."delivery_orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."documents_document_type_enum"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "tracking"`);
        await queryRunner.query(`DROP TYPE "public"."tracking_status_enum"`);
        await queryRunner.query(`DROP TABLE "bl"`);
        await queryRunner.query(`DROP TYPE "public"."bl_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "vessels"`);
        await queryRunner.query(`DROP TYPE "public"."vessels_status_enum"`);
    }

}
