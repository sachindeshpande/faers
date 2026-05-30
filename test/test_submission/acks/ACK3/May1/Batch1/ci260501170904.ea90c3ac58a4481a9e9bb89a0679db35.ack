<?xml version="1.0" encoding="UTF-8"?><MCCI_IN200101UV01 xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ITSVersion="XML_1.0" xsi:schemaLocation="urn:hl7-org:v3 MCCI_IN200101UV01.xsd">
	<id extension="3230423429" root="2.16.840.1.113883.3.989.2.1.3.20"/>
	<!-- ACK.M.1: Acknowledgement Batch Number -->
	<creationTime value="20260501131439-0400"/>
	<!-- ACK.M.4: Acknowledgement Date of Batch Transmission -->
	<responseModeCode code="D"/>
	<interactionId extension="MCCI_IN200101UV01" root="2.16.840.1.113883.1.6"/>
	<!-- Ack Message #1 -->
	<MCCI_IN000002UV01>
		<id extension="854545" root="2.16.840.1.113883.3.989.2.1.3.19"/>
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
			<value value="20260315100000-0400" xsi:type="TS"/>
			<!-- ACK.B.r.5: Date of ICSR Message Creation -->
		</attentionLine>
		<acknowledgement typeCode="CR">
			<!-- ACK.B.r.6: Acknowledgement Code for a ICSR Message -->
			<targetMessage>
				<id extension="SR-CASE-EXAMPLE-TCF04" root="2.16.840.1.113883.3.989.2.1.3.1"/>
				<!-- ACK.B.r.1: ICSR Message Number -->
			</targetMessage>
			<acknowledgementDetail>
				<text>Safety report not loaded; Validated against 2.18 business rules;
Rejections:
1: C.5.4 must be provided when C.1.3 = 2 and N.2.r.3 = "CDER".
2: Study Type Where Reaction(s) / Event(s) Were Observed - C.5.4/A.2.3.3  must be provided when Type of report - C.1.3/A.1.4 is equal to 2 (Report from studies)
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
		<value extension="770280" root="2.16.840.1.113883.3.989.2.1.3.21" xsi:type="II"/>
		<!-- ACK.A.2: Acknowledgement Local Message Number -->
	</attentionLine>
	<attentionLine>
		<keyWordText code="3" codeSystem="2.16.840.1.113883.3.989.2.1.1.24" codeSystemVersion="1.0" displayName="dateOfIcsrBatchTransmission"/>
		<value value="20260315100000-0400" xsi:type="TS"/>
		<!-- ACK.A.3: Date of ICSR Batch Transmission -->
	</attentionLine>
	<acknowledgement typeCode="AR">
		<!-- ACK.A.4: Transmission Acknowledgement Code -->
		<targetBatch>
			<id extension="DeepQuenceTest-20260429-580ba4f7-284e-4f15-a430-2dafe1068d42" root="2.16.840.1.113883.3.989.2.1.3.22"/>
			<!-- ACK.A.1: ICSR Batch Number -->
			<!-- the sender-identifier-value is the batch sender value in M.1.4 -->
		</targetBatch>
		<acknowledgementDetail>
			<text>Application Acknowledgment Reject (parsing error, no data extracted, re-send the entire transaction)</text>
			<!-- ACK.A.5: Batch Validation Error -->
		</acknowledgementDetail>
	</acknowledgement>
</MCCI_IN200101UV01>