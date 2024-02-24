--
-- PostgreSQL database dump
--

-- Dumped from database version 12.18 (Ubuntu 12.18-1.pgdg22.04+1)
-- Dumped by pg_dump version 12.18 (Ubuntu 12.18-1.pgdg22.04+1)

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
    balance character varying NOT NULL,
    amount character varying NOT NULL,
    proof character(66)[] NOT NULL
);


--
-- Name: whitelists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whitelists (
    launchpad character(42) NOT NULL,
    root character(66) NOT NULL
);


--
-- Name: whitelists_proofs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whitelists_proofs (
    launchpad character(42) NOT NULL,
    address character(42) NOT NULL,
    proof character(66)[] NOT NULL
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
-- Name: whitelists whitelists_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelists
    ADD CONSTRAINT whitelists_pk PRIMARY KEY (launchpad);


--
-- Name: whitelists_proofs whitelists_proofs_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelists_proofs
    ADD CONSTRAINT whitelists_proofs_pk PRIMARY KEY (launchpad, address);


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
-- Name: whitelists_proofs_address_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX whitelists_proofs_address_index ON public.whitelists_proofs USING btree (address);


--
-- Name: distributions_proofs distributions_proofs_distributions_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distributions_proofs
    ADD CONSTRAINT distributions_proofs_distributions_fk FOREIGN KEY (chain_id, token, block_number) REFERENCES public.distributions(chain_id, token, block_number);


--
-- Name: whitelists_proofs whitelists_proofs_whitelists_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whitelists_proofs
    ADD CONSTRAINT whitelists_proofs_whitelists_fk FOREIGN KEY (launchpad) REFERENCES public.whitelists(launchpad);


--
-- PostgreSQL database dump complete
--

