<?xml version="1.0" encoding="UTF-8"?><MCCI_IN200101UV01 xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ITSVersion="XML_1.0" xsi:schemaLocation="urn:hl7-org:v3 MCCI_IN200101UV01.xsd">
	<id extension="3229662722" root="2.16.840.1.113883.3.989.2.1.3.20"/>
	<!-- ACK.M.1: Acknowledgement Batch Number -->
	<creationTime value="20260409221335-0400"/>
	<!-- ACK.M.4: Acknowledgement Date of Batch Transmission -->
	<responseModeCode code="D"/>
	<interactionId extension="MCCI_IN200101UV01" root="2.16.840.1.113883.1.6"/>
	<!-- Ack Message #1 -->
	<MCCI_IN000002UV01>
		<id extension="836918" root="2.16.840.1.113883.3.989.2.1.3.19"/>
		<!-- ACK.B.r.2 Local Report Number -->
		<interactionId extension="MCCI_IN000002UV01" root="2.16.840.1.113883.1.6"/>
		<processingCode code="P"/>
		<processingModeCode code="T"/>
		<acceptAckCode code="NE"/>
		<receiver typeCode="RCV">
			<device classCode="DEV" determinerCode="INSTANCE">
				<id extension="334818134" root="2.16.840.1.113883.3.989.2.1.3.16"/>
				<!-- ACK.B.r.3: ICSR Message ACK Receiver -->
			</device>
		</receiver>
		<sender typeCode="SND">
			<device classCode="DEV" determinerCode="INSTANCE">
				<id extension="CDER" root="2.16.840.1.113883.3.989.2.1.3.15"/>
				<!-- ACK.B.r.4: ICSR Message ACK Sender -->
			</device>
		</sender>
		<attentionLine>
			<keyWordText code="1" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="dateOfIcsrMessageCreation"/>
			<value value="20260331191451-0400" xsi:type="TS"/>
			<!-- ACK.B.r.5: Date of ICSR Message Creation -->
		</attentionLine>
		<acknowledgement typeCode="CR">
			<!-- ACK.B.r.6: Acknowledgement Code for a ICSR Message -->
			<targetMessage>
				<id extension="SR-CASE-20260331-EMJQ" root="2.16.840.1.113883.3.989.2.1.3.1"/>
				<!-- ACK.B.r.1: ICSR Message Number -->
			</targetMessage>
			<acknowledgementDetail>
				<text>Safety report not loaded; Validated against 2.18 business rules;
Rejections:
1: Data value required for tag C.3.4.3.
2: Data value required for tag C.3.4.5.
3: Data value required for tag C.3.3.2.
4: Data value required for tag C.3.4.2.
5: Data value required for tag C.3.4.6.
6: Data value required for tag C.3.3.3.
7: Data value required for tag C.3.4.8.
8: Data value required for tag C.3.4.7.
9: Data value required for tag C.3.3.5.
10: Data value required for tag C.3.4.4.
11: Data value required for tag C.3.3.1.
12: Data value required for tag C.3.4.1.
13: Data value required for tag C.3.1.
</text>
				<!-- ACK.B.r.7: Error / Warning Message or Comment -->
			</acknowledgementDetail>
		</acknowledgement>
	</MCCI_IN000002UV01>
	<!-- Ack Message #1 -->
	<receiver typeCode="RCV">
		<device classCode="DEV" determinerCode="INSTANCE">
			<id extension="334818134" root="2.16.840.1.113883.3.989.2.1.3.18"/>
			<!-- ACK.M.3: Acknowledgement Batch Receiver Identifier -->
		</device>
	</receiver>
	<sender typeCode="SND">
		<device classCode="DEV" determinerCode="INSTANCE">
			<id extension="ZZFDATST" root="2.16.840.1.113883.3.989.2.1.3.17"/>
			<!-- ACK.M.2: Acknowledgement Batch Sender Identifier -->
		</device>
	</sender>
	<attentionLine>
		<keyWordText code="2" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="acknowledgementLocalMessageNumber"/>
		<value extension="752774" root="2.16.840.1.113883.3.989.2.1.3.21" xsi:type="II"/>
		<!-- ACK.A.2: Acknowledgement Local Message Number -->
	</attentionLine>
	<attentionLine>
		<keyWordText code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="dateOfIcsrBatchTransmission"/>
		<value value="20260331191451-0400" xsi:type="TS"/>
		<!-- ACK.A.3: Date of ICSR Batch Transmission -->
	</attentionLine>
	<acknowledgement typeCode="AR">
		<!-- ACK.A.4: Transmission Acknowledgement Code -->
		<targetBatch>
			<id extension="DeepQuenceTest-20260409-v34-e7b2c095-1f4a-4d3e-a6c8-7d9f2b5e1a04" root="2.16.840.1.113883.3.989.2.1.3.22"/>
			<!-- ACK.A.1: ICSR Batch Number -->
			<!-- the sender-identifier-value is the batch sender value in M.1.4 -->
		</targetBatch>
		<acknowledgementDetail>
			<text>Application Acknowledgment Reject (parsing error, no data extracted, re-send the entire transaction)</text>
			<!-- ACK.A.5: Batch Validation Error -->
		</acknowledgementDetail>
	</acknowledgement>
</MCCI_IN200101UV01>