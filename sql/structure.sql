--
-- PostgreSQL database dump
--

-- Dumped from database version 12.15 (Ubuntu 12.15-0ubuntu0.20.04.1)
-- Dumped by pg_dump version 12.15 (Ubuntu 12.15-0ubuntu0.20.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: snapshots_v1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshots_v1 (
    block_number bigint NOT NULL,
    address character(42) NOT NULL,
    balance character varying NOT NULL,
    is_contract boolean NOT NULL,
    is_blacklisted boolean NOT NULL
);


--
-- Name: snapshots_v1 snapshots_v1_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots_v1
    ADD CONSTRAINT snapshots_v1_pk PRIMARY KEY (block_number, address);


--
-- Name: snapshots_v1_address_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX snapshots_v1_address_index ON public.snapshots_v1 USING btree (address);


--
-- PostgreSQL database dump complete
--
