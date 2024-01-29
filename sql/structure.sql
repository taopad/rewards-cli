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
-- Name: distributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distributions (
    chain_id integer NOT NULL,
    token character(42) NOT NULL,
    block_number bigint NOT NULL,
    total_shares character varying NOT NULL,
    total_rewards character varying NOT NULL,
    root character(66) NOT NULL
);


--
-- Name: distributions_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distributions_proofs (
    chain_id integer NOT NULL,
    token character(42) NOT NULL,
    block_number bigint NOT NULL,
    address character(42) NOT NULL,
    amount character varying NOT NULL,
    proofs character(66)[] NOT NULL
);


--
-- Name: snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshots (
    block_number bigint NOT NULL,
    address character(42) NOT NULL,
    balance character varying NOT NULL,
    is_contract boolean NOT NULL,
    is_blacklisted boolean NOT NULL
);


--
-- Name: whitelists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whitelists (
    block_number bigint NOT NULL,
    min_amount character varying NOT NULL,
    root character(66) NOT NULL
);


--
-- Name: whitelists_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whitelists_proofs (
    block_number bigint NOT NULL,
    address character(42) NOT NULL,
    balance character varying NOT NULL,
    proofs character(66)[] NOT NULL
);


--
-- Name: distributions distributions_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributions
    ADD CONSTRAINT distributions_pk PRIMARY KEY (chain_id, token, block_number);


--
-- Name: distributions_proofs distributions_proofs_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributions_proofs
    ADD CONSTRAINT distributions_proofs_pk PRIMARY KEY (chain_id, token, block_number, address);


--
-- Name: snapshots snapshots_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_pk PRIMARY KEY (block_number, address);


--
-- Name: whitelists whitelists_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelists
    ADD CONSTRAINT whitelists_pk PRIMARY KEY (block_number);


--
-- Name: whitelists_proofs whitelists_proofs_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelists_proofs
    ADD CONSTRAINT whitelists_proofs_pk PRIMARY KEY (block_number, address);


--
-- Name: distributions_block_number_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX distributions_block_number_index ON public.distributions USING btree (block_number);


--
-- Name: distributions_proofs_address_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX distributions_proofs_address_index ON public.distributions_proofs USING btree (address);


--
-- Name: distributions_proofs_block_number_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX distributions_proofs_block_number_index ON public.distributions_proofs USING btree (block_number);


--
-- Name: distributions_proofs_token_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX distributions_proofs_token_index ON public.distributions_proofs USING btree (token);


--
-- Name: distributions_token_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX distributions_token_index ON public.distributions USING btree (token);


--
-- Name: snapshots_address_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX snapshots_address_index ON public.snapshots USING btree (address);


--
-- Name: whitelists_proofs_address_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whitelists_proofs_address_index ON public.whitelists_proofs USING btree (address);


--
-- PostgreSQL database dump complete
--

